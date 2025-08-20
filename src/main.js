const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const sql = require('mssql');
const fs = require('fs');
const puppeteer = require('puppeteer');
require('dotenv').config();
const { BlobServiceClient } = require('@azure/storage-blob');

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (!AZURE_STORAGE_CONNECTION_STRING) {
    console.error("Azure Storage Connection String is not set. Please create a .env file and set AZURE_STORAGE_CONNECTION_STRING.");
    // We don't want the app to run without this, but we also don't want to crash it immediately.
    // The upload function will handle the error gracefully.
}

let pool;
const AZURE_DB_CONNECTION_STRING = process.env.AZURE_DB_CONNECTION_STRING;
if (!AZURE_DB_CONNECTION_STRING) {
    console.error("Azure DB Connection String is not set. Please create a .env file and set AZURE_DB_CONNECTION_STRING.");
} else {
    const poolPromise = new sql.ConnectionPool(AZURE_DB_CONNECTION_STRING)
        .connect()
        .then(p => {
            console.log('Connected to Azure SQL Database');
            pool = p;
            return p;
        })
        .catch(err => console.error('Database Connection Failed! Bad Config: ', err));
}

function createWindow () {
  const mainWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist', 'index.html'));
    // Optional in production; comment out if you don’t want it
    mainWindow.webContents.openDevTools();
  }
};

async function executeQuery(sqlQuery, params = []) {
    const request = pool.request();
    params.forEach((param, i) => {
        request.input(`param${i+1}`, param);
    });
    const result = await request.query(sqlQuery);
    return result.recordset;
}

async function executeTransaction(queries) {
    const transaction = new sql.Transaction(pool);
    try {
        await transaction.begin();
        const results = [];
        for (const [sqlQuery, params] of queries) {
            const request = new sql.Request(transaction);
            params.forEach((param, i) => {
                request.input(`param${i + 1}`, param);
            });
            const result = await request.query(sqlQuery);
            results.push(result);
        }
        await transaction.commit();
        return results.map(r => r.recordset);
    } catch (err) {
        await transaction.rollback();
        throw err;
    }
}

ipcMain.handle('db-query', (event, sqlQuery, params) => executeQuery(sqlQuery, params));

ipcMain.handle('db-get', async (event, sqlQuery, params = []) => {
    const recordset = await executeQuery(sqlQuery, params);
    return recordset[0] || null;
});

ipcMain.handle('db-run', async (event, sqlQuery, params = []) => {
    if (sqlQuery.trim().toUpperCase().startsWith('INSERT')) {
        sqlQuery += '; SELECT SCOPE_IDENTITY() AS lastID;';
    }
    const recordset = await executeQuery(sqlQuery, params);
    if (recordset && recordset.length > 0 && recordset[0].lastID !== undefined) {
        return { lastID: recordset[0].lastID, changes: 1 };
    }
    return { lastID: null, changes: 1 };
});

ipcMain.handle('db-transaction', (event, queries) => executeTransaction(queries));

ipcMain.handle('get-css-path', async () => {
    if (!app.isPackaged) {
        return 'http://localhost:5173/src/renderer/index.css';
    } else {
        const cssPath = path.join(app.getAppPath(), 'dist', 'index.css');
        return `file://${cssPath}`;
    }
});

// A debounced version of our recalculation logic.
// This prevents the function from being called too frequently, which could cause race conditions or performance issues.
const debouncedRecalculation = {};
ipcMain.handle('recalculate-and-update-progress', async (event, { datapackId, documentId, traineeId = null }) => {
    const document = await executeQuery('SELECT name, scope FROM documents WHERE id = @param1', [documentId]).then(rows => rows[0] || null);
    if (!document) {
        console.error(`Recalculate progress: Document with ID ${documentId} not found.`);
        return;
    }

    // If a document is not candidate-specific, we should only ever manage a single progress
    // record for it, where trainee_id is NULL.
    const isCandidateScoped = document.scope === 'candidate';
    const finalTraineeId = isCandidateScoped ? traineeId : null;

    // 1. Fetch all necessary data in parallel
    const [datapack, questions, allResponses] = await Promise.all([
        executeQuery('SELECT trainee_ids, duration, course_id FROM datapack WHERE id = @param1', [datapackId]).then(rows => rows[0] || null),
        executeQuery('SELECT * FROM questionnaires WHERE document_id = @param1', [documentId]),
        executeQuery('SELECT field_name, response_data FROM responses WHERE datapack_id = @param1 AND document_id = @param2', [datapackId, documentId]),
    ]);

    const traineeIds = datapack?.trainee_ids ? datapack.trainee_ids.split(',').filter(id => id) : [];
    const responseMap = allResponses.reduce((acc, row) => {
        acc[row.field_name] = row.response_data;
        return acc;
    }, {});

    // 2. Build the list of active questions that require completion
    let activeQuestions = [];

    // A. Add questions from the database, respecting dependencies and course duration
    for (const q of questions) {
        // Skip day-specific questions if they are outside the event's duration
        if (q.field_name.startsWith('day_')) {
            const dayNumber = parseInt(q.field_name.split('_')[1], 10);
            if (!isNaN(dayNumber) && dayNumber > (datapack?.duration || 0)) {
                continue;
            }
        }
        // For the Register, we handle competencies separately, so skip the DB version
        if (document.name === 'Register' && q.section === 'COMPETENCIES') {
            continue;
        }

        let isRequired = q.required === 'yes';
        if (q.required === 'dependant' && q.dependency) {
            const dependencyResponse = responseMap[q.dependency];
            if (dependencyResponse && String(dependencyResponse).trim() !== '') {
                isRequired = true;
            }
        }
        if (isRequired) {
            activeQuestions.push(q);
        }
    }

    // B. For the Register, manually add competency grid checks based on the course
    if (document.name === 'Register' && datapack.course_id) {
        const course = await executeQuery('SELECT competency_ids FROM courses WHERE id = @param1', [datapack.course_id]).then(rows => rows[0] || null);
        const courseCompetencyIds = course?.competency_ids ? course.competency_ids.split(',').filter(id => id) : [];

        if (courseCompetencyIds.length > 0) {
            const courseCompetencies = await executeQuery(`SELECT id, name FROM competencies WHERE id IN (${courseCompetencyIds.map((_, i) => `@param${i+1}`).join(',')})`, courseCompetencyIds);

            for (const competency of courseCompetencies) {
                const fieldName = `competency_${competency.name.toLowerCase().replace(/[\s/]+/g, '_')}`;
                activeQuestions.push({
                    field_name: fieldName,
                    input_type: 'trainee_dropdown_grid', // This is a standard grid check
                });
            }
        }
    }

    if (activeQuestions.length === 0) return 0; // Nothing to complete

    // 3. Count how many active questions are actually complete
    let completedCount = 0;
    const completionStatusMap = new Map();
    for (const q of activeQuestions) {
        const responseData = responseMap[q.field_name];
        let isComplete = false;

        switch (q.input_type) {
            case 'checkbox':
                isComplete = responseData === 'true' || responseData === 1 || responseData === '1';
                break;
            case 'tri_toggle':
                isComplete = responseData !== 'neutral' && responseData !== '';
                break;
            case 'competency_grid': // Our custom type
                try {
                    const gridData = JSON.parse(responseData || '{}');
                    // Check that every required competency for THIS course has a non-empty value for every trainee
                    isComplete = traineeIds.every(t_id =>
                        q.required_ids.every(c_id =>
                            gridData[t_id] && gridData[t_id][c_id] !== undefined && gridData[t_id][c_id] !== ''
                        )
                    );
                } catch { isComplete = false; }
                break;
            case 'attendance_grid':
            case 'trainee_checkbox_grid':
            case 'trainee_date_grid':
            case 'trainee_dropdown_grid':
            case 'trainee_yes_no_grid':
            case 'signature_grid':
                try {
                    const gridData = JSON.parse(responseData || '{}');
                    isComplete = traineeIds.every(id => gridData[id] !== undefined && gridData[id] !== '');
                } catch { isComplete = false; }
                break;
            default: // Catches text, dropdown, signature, etc.
                isComplete = responseData && String(responseData).trim() !== '';
                break;
        }
        if (isComplete) {
            completedCount++;
        }
        completionStatusMap.set(q.field_name, isComplete);
    }

    // 4. Calculate percentage and update the database and UI
    const percentage = Math.round((completedCount / activeQuestions.length) * 100);

    const dbQueries = [];

    // Check if a progress record already exists
    let sqlSelect;
    const params = [datapackId, documentId];
    if (finalTraineeId) {
        sqlSelect = 'SELECT id FROM document_progress WHERE datapack_id = @param1 AND document_id = @param2 AND trainee_id = @param3';
        params.push(finalTraineeId);
    } else {
        sqlSelect = 'SELECT id FROM document_progress WHERE datapack_id = @param1 AND document_id = @param2 AND trainee_id IS NULL';
    }
    const existingProgress = await executeQuery(sqlSelect, params).then(rows => rows[0] || null);

    // If it exists, update it. Otherwise, insert a new record.
    if (existingProgress) {
        dbQueries.push([
            `UPDATE document_progress SET completion_percentage = @param1 WHERE id = @param2`,
            [percentage, existingProgress.id]
        ]);
    } else {
        dbQueries.push([
            `INSERT INTO document_progress (datapack_id, document_id, trainee_id, completion_percentage) VALUES (@param1, @param2, @param3, @param4)`,
            [datapackId, documentId, finalTraineeId, percentage]
        ]);
    }
    
    // Queries to update the 'completed' flag for each individual response
    for (const [fieldName, isComplete] of completionStatusMap.entries()) {
        dbQueries.push([
            `UPDATE responses SET completed = @param1 WHERE datapack_id = @param2 AND document_id = @param3 AND field_name = @param4`,
            [isComplete ? 1 : 0, datapackId, documentId, fieldName]
        ]);
    }

    // Execute all updates in a single transaction
    await executeTransaction(dbQueries);

    const window = BrowserWindow.getFocusedWindow();
    if (window) {
        window.webContents.send('progress-updated', { datapackId, documentId, traineeId, progress: percentage });
    }

    return percentage;
  });

const queryDb = (sqlQuery, params = []) => executeQuery(sqlQuery, params);

const runDb = (sqlQuery, params = []) => executeQuery(sqlQuery, params);

ipcMain.handle('generate-pdf-from-html', async (event, htmlContent, datapackId, options = {}) => {
    // Save to a temporary directory to avoid cluttering the user's documents
    const tempPath = app.getPath('temp');
    // Use a unique filename to prevent conflicts
    const filePath = path.join(tempPath, `globaltrain_doc_${datapackId}_${Date.now()}.pdf`);

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            landscape: options.landscape || false,
        });

        // Open the generated PDF with the default system viewer
        await shell.openPath(filePath);

    } catch (error) {
        console.error('Failed to generate or open PDF with Puppeteer:', error);
        throw error; // Propagate error back to renderer
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // Return a success message instead of a file path
    return 'PDF generated and opened successfully.';
});

ipcMain.handle('generatePdfInBackground', async (event, { htmlContent, options = {} }) => {
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            landscape: options.landscape || false,
        });
        return pdfBuffer;
    } catch (error) {
        console.error('Failed to generate PDF in background:', error);
        throw new Error('Failed to generate PDF.');
    } finally {
        if (browser) {
            await browser.close();
        }
    }
});

ipcMain.handle('generateAndUploadPdf', async (event, { htmlContent, fileName, contentType, eventDetails, documentDetails, traineeDetails, options = {} }) => {
    // 1. Generate PDF Buffer
    let pdfBuffer;
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            landscape: options.landscape || false,
        });
    } catch (error) {
        console.error('Failed to generate PDF for upload:', error);
        throw new Error('Failed to generate PDF.');
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    // 2. Upload the buffer to Azure
    if (!AZURE_STORAGE_CONNECTION_STRING) {
        throw new Error('Azure Storage connection string is not configured.');
    }
    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
        const containerName = 'documents';
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists();

        const basePath = await buildBlobPath(eventDetails, documentDetails, traineeDetails, fileName);
        const blobPath = `${basePath}${fileName}`;

        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

        await blockBlobClient.uploadData(pdfBuffer, {
            blobHTTPHeaders: { blobContentType: contentType }
        });

        // After successful upload, update the database
        const fieldName = documentDetails.name.replace(/\s+/g, '_') + '_pdf';
        const updateQuery = `
            MERGE responses AS target
            USING (SELECT @param1 AS datapack_id, @param2 AS document_id, @param3 AS field_name) AS source
            ON (target.datapack_id = source.datapack_id AND target.document_id = source.document_id AND target.field_name = source.field_name)
            WHEN MATCHED THEN
                UPDATE SET response_data = @param4, completed = 1
            WHEN NOT MATCHED THEN
                INSERT (datapack_id, document_id, field_name, response_data, completed)
                VALUES (source.datapack_id, source.document_id, source.field_name, @param4, 1);
        `;

        await executeQuery(updateQuery, [
            eventDetails.id,
            documentDetails.id,
            fieldName,
            blockBlobClient.url
        ]);

        return blockBlobClient.url;
    } catch (error) {
        console.error('Error uploading PDF to Azure Blob Storage:', error.message);
        throw new Error(`Failed to upload ${fileName} to Azure.`);
    }
});

ipcMain.handle('get-logo-base64', async () => {
    try {
        const logoFileName = 'GlobalTrainLogo.jpg'; // Correct filename
        // This is a more reliable way to get the path in both dev and packaged modes.
        const logoPath = app.isPackaged
            // In a packaged app, the 'public' assets are copied to 'dist'.
            ? path.join(process.resourcesPath, 'dist', logoFileName)
            // In dev mode, the 'public' folder is at the project root.
            : path.join(app.getAppPath(), 'public', logoFileName);

        const logoBuffer = await fs.promises.readFile(logoPath);
        return `data:image/jpeg;base64,${logoBuffer.toString('base64')}`;
    } catch (error) {
        console.error('Failed to read logo file:', error);
        return null; // Return null if the logo can't be loaded
    }
});

const formatDateForPath = (date, format) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const monthName = d.toLocaleString('default', { month: 'long' });

    if (format === 'mm. month yyyy') {
        return `${month} ${monthName} ${year}`;
    }
    if (format === 'dd.mm.yyyy') {
        return `${day}.${month}.${year}`;
    }
    return date.toString();
};

const buildBlobPath = async (eventDetails, documentDetails, traineeDetails, fileName) => {
    const monthFolderName = formatDateForPath(eventDetails.start_date, 'mm. month yyyy');

    // Fetch trainer details from the database using trainer_id from eventDetails
    const trainerRows = await queryDb('SELECT forename, surname FROM users WHERE id = @param1', [eventDetails.trainer_id]);
    const trainer = trainerRows[0] || {};
    const trainerInitial = trainer.forename ? trainer.forename.charAt(0) : '';
    const trainerSurname = trainer.surname || '';

    const eventFolderName = `${formatDateForPath(eventDetails.start_date, 'dd.mm.yyyy')} ${eventDetails.courseName} ${trainerInitial} ${trainerSurname}`;

    let finalSubPath = documentDetails.save || '';

    // If the trainee isn't directly provided, try to infer from the filename
    let targetTrainee = traineeDetails;
    if (!targetTrainee && documentDetails.scope === 'candidate') {
        const nameParts = fileName.split('_');
        if (nameParts.length >= 2) {
            const forename = nameParts[0];
            const surname = nameParts[1];
            // Find the trainee in the event's trainee list
            const allTrainees = await queryDb(`SELECT * FROM trainees WHERE id IN (${eventDetails.trainee_ids.split(',').map((_, i) => `@param${i+1}`).join(',')})`, eventDetails.trainee_ids.split(','));
            targetTrainee = allTrainees.find(t => t.forename === forename && t.surname === surname);
        }
    }

    // This is the key change: Only create indexed trainee folders for the generic 'Candidates/' path
    if (documentDetails.scope === 'candidate' && targetTrainee && finalSubPath === 'Candidates/') {
        const traineeIndex = (eventDetails.trainee_ids.split(',').indexOf(String(targetTrainee.id)) + 1).toString().padStart(2, '0');
        const candidateFolderName = `${traineeIndex}_${targetTrainee.forename}_${targetTrainee.surname}`;
        finalSubPath = `Candidates/${candidateFolderName}/`;
    }

    return `Training/${monthFolderName}/${eventFolderName}/${finalSubPath}`;
};

ipcMain.handle('upload-file-to-blob', async (event, { fileData, fileName, contentType, eventDetails, documentDetails, traineeDetails }) => {
    if (!AZURE_STORAGE_CONNECTION_STRING) {
        throw new Error('Azure Storage connection string is not configured.');
    }

    try {
        const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

        const containerName = 'documents'; // All documents will go into this single container
        const containerClient = blobServiceClient.getContainerClient(containerName);
        await containerClient.createIfNotExists();

        const basePath = await buildBlobPath(eventDetails, documentDetails, traineeDetails, fileName);
        const blobPath = `${basePath}${fileName}`;

        const blockBlobClient = containerClient.getBlockBlobClient(blobPath);

        const buffer = Buffer.from(fileData, 'base64');

        await blockBlobClient.uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: contentType }
        });

        // Return the URL of the uploaded blob
        return blockBlobClient.url;
    } catch (error) {
        console.error('Error uploading to Azure Blob Storage:', error.message);
        throw new Error(`Failed to upload ${fileName} to Azure.`);
    }
});

ipcMain.handle('app-quit', () => {
    app.quit();
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  ipcMain.handle('get-documents-path', () => app.getPath('documents'));

  ipcMain.handle('initialize-user-session', async (event, user) => {
    if (!user || !user.id) return;
    // Removed folder generation logic as per instructions.
  });

  ipcMain.handle('get-courses', async () => {
    return queryDb('SELECT * FROM courses ORDER BY name');
  });

  ipcMain.handle('get-documents', async () => {
    return queryDb('SELECT id, name, scope FROM documents ORDER BY name');
  });

  ipcMain.handle('get-competencies', async () => {
    return queryDb('SELECT id, name FROM competencies ORDER BY name');
  });

  ipcMain.handle('add-course', async (event, { name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids }) => {
    const sqlQuery = `INSERT INTO courses (name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids) VALUES (@param1, @param2, @param3, @param4, @param5)`;
    return runDb(sqlQuery, [name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids]);
  });

  ipcMain.handle('update-course', async (event, { id, name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids }) => {
    const sqlQuery = `UPDATE courses SET name = @param1, doc_ids = @param2, competency_ids = @param3, course_length = @param4, non_mandatory_doc_ids = @param5 WHERE id = @param6`;
    return runDb(sqlQuery, [name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids, id]);
  });

  ipcMain.handle('delete-course', async (event, id) => {
    // Optional: Check if the course is used in any datapacks before deleting
    const datapacks = await queryDb('SELECT id FROM datapack WHERE course_id = @param1', [id]);
    if (datapacks.length > 0) {
        throw new Error('Cannot delete this course because it is currently used in one or more events.');
    }
    
    const sqlQuery = `DELETE FROM courses WHERE id = @param1`;
    return runDb(sqlQuery, [id]);
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 