const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
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

function createWindow () {
  const mainWindow = new BrowserWindow({
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // In production, load the a file. In development, load a url
    if (process.env.NODE_ENV === 'production') {
        mainWindow.loadFile('dist/index.html')
    } else {
        mainWindow.loadURL('http://localhost:5173');
    }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

const dbPath = path.resolve(__dirname, '../database.db');
const db = new sqlite3.Database(dbPath);

ipcMain.handle('db-query', async (event, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
});

ipcMain.handle('db-get', async (event, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
});

ipcMain.handle('db-run', async (event, sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) { // Must use function() to get 'this' scope
            if (err) {
                reject(err);
            } else {
                // 'this' contains properties like 'lastID' and 'changes'
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
});

ipcMain.handle('db-transaction', async (event, queries) => {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) return reject(err);

                for (const [sql, params] of queries) {
                    db.run(sql, params, function(err) {
                        if (err) {
                            db.run('ROLLBACK');
                            return reject(err);
                        }
                    });
                }

                db.run('COMMIT', (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                    }
                    resolve();
                });
            });
        });
    });
});

ipcMain.handle('get-css-path', async () => {
    if (process.env.NODE_ENV !== 'production') {
        // In development, point to the Vite server
        return 'http://localhost:5173/src/renderer/index.css';
    } else {
        // In production, point to the bundled CSS file
        // Note: The exact path might need adjustment based on your build output structure
        const cssPath = path.join(app.getAppPath(), 'dist/index.css');
        return `file://${cssPath}`;
    }
});

// A debounced version of our recalculation logic.
// This prevents the function from being called too frequently, which could cause race conditions or performance issues.
const debouncedRecalculation = {};
ipcMain.handle('recalculate-and-update-progress', async (event, { datapackId, documentId, traineeId = null }) => {
    // 1. Fetch all necessary data in parallel
    const [datapack, questions, allResponses, document] = await Promise.all([
        new Promise((resolve, reject) => db.get('SELECT trainee_ids, duration, course_id FROM datapack WHERE id = ?', [datapackId], (err, row) => err ? reject(err) : resolve(row))),
        new Promise((resolve, reject) => db.all('SELECT * FROM questionnaires WHERE document_id = ?', [documentId], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.all('SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = ?', [datapackId, documentId], (err, rows) => err ? reject(err) : resolve(rows))),
        new Promise((resolve, reject) => db.get('SELECT name FROM documents WHERE id = ?', [documentId], (err, row) => err ? reject(err) : resolve(row)))
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
        const course = await new Promise((resolve, reject) => db.get('SELECT competency_ids FROM courses WHERE id = ?', [datapack.course_id], (err, row) => err ? reject(err) : resolve(row)));
        const courseCompetencyIds = course?.competency_ids ? course.competency_ids.split(',').filter(id => id) : [];
        
        if (courseCompetencyIds.length > 0) {
            const courseCompetencies = await new Promise((resolve, reject) => {
                const sql = `SELECT id, name FROM competencies WHERE id IN (${courseCompetencyIds.map(() => '?').join(',')})`;
                db.all(sql, courseCompetencyIds, (err, rows) => err ? reject(err) : resolve(rows));
            });

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
    const existingProgress = await new Promise((resolve, reject) => {
        let sql = 'SELECT id FROM document_progress WHERE datapack_id = ? AND document_id = ?';
        const params = [datapackId, documentId];

        if (traineeId) {
            sql += ' AND trainee_id = ?';
            params.push(traineeId);
        } else {
            sql += ' AND trainee_id IS NULL';
        }
        
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

    // If it exists, update it. Otherwise, insert a new record.
    if (existingProgress) {
        dbQueries.push([
            `UPDATE document_progress SET completion_percentage = ? WHERE id = ?`,
            [percentage, existingProgress.id]
        ]);
    } else {
        dbQueries.push([
            `INSERT INTO document_progress (datapack_id, document_id, trainee_id, completion_percentage) VALUES (?, ?, ?, ?)`,
            [datapackId, documentId, traineeId, percentage]
        ]);
    }
    
    // Queries to update the 'completed' flag for each individual response
    for (const [fieldName, isComplete] of completionStatusMap.entries()) {
        dbQueries.push([
            `UPDATE responses SET completed = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?`,
            [isComplete ? 1 : 0, datapackId, documentId, fieldName]
        ]);
    }

    // Execute all updates in a single transaction
    await new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', err => { if (err) return reject(err); });
            for (const [sql, params] of dbQueries) {
                db.run(sql, params, function(err) { if (err) { db.run('ROLLBACK'); return reject(err); }});
            }
            db.run('COMMIT', err => {
                if (err) { db.run('ROLLBACK'); return reject(err); }
                
                const window = BrowserWindow.getFocusedWindow();
                if (window) {
                    window.webContents.send('progress-updated', { datapackId, documentId, traineeId, progress: percentage });
                }
                resolve();
            });
        });
    });

    return percentage;
  });

const queryDb = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('DB Query Error:', err.message);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

const runDb = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                console.error('DB Run Error:', err.message);
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
};

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
    const trainerRows = await queryDb('SELECT forename, surname FROM users WHERE id = ?', [eventDetails.trainer_id]);
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
            const allTrainees = await queryDb(`SELECT * FROM trainees WHERE id IN (${eventDetails.trainee_ids})`);
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

ipcMain.handle('upload-file-to-blob', async (event, { fileData, fileName, eventDetails, documentDetails, traineeDetails }) => {
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
        
        await blockBlobClient.uploadData(buffer);

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
    const sql = `INSERT INTO courses (name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids) VALUES (?, ?, ?, ?, ?)`;
    return new Promise((resolve, reject) => {
        db.run(sql, [name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids], function(err) {
            if (err) reject(err);
            else resolve({ id: this.lastID });
        });
    });
  });

  ipcMain.handle('update-course', async (event, { id, name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids }) => {
    const sql = `UPDATE courses SET name = ?, doc_ids = ?, competency_ids = ?, course_length = ?, non_mandatory_doc_ids = ? WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, [name, doc_ids, competency_ids, course_length, non_mandatory_doc_ids, id], function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
  });

  ipcMain.handle('delete-course', async (event, id) => {
    // Optional: Check if the course is used in any datapacks before deleting
    const datapacks = await queryDb('SELECT id FROM datapack WHERE course_id = ?', [id]);
    if (datapacks.length > 0) {
        throw new Error('Cannot delete this course because it is currently used in one or more events.');
    }
    
    const sql = `DELETE FROM courses WHERE id = ?`;
    return new Promise((resolve, reject) => {
        db.run(sql, [id], function(err) {
            if (err) reject(err);
            else resolve({ changes: this.changes });
        });
    });
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