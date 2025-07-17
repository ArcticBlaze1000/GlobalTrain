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
ipcMain.handle('recalculate-and-update-progress', async (event, { datapackId, documentId, traineeId }) => {
    // A unique key for each combination of document and trainee
    const debounceKey = `${datapackId}-${documentId}-${traineeId || 'event'}`;

    // Clear any pending timeout to reset the debounce timer
    if (debouncedRecalculation[debounceKey]) {
        clearTimeout(debouncedRecalculation[debounceKey]);
    }

    // Set a new timeout
    debouncedRecalculation[debounceKey] = setTimeout(async () => {
        try {
            await performProgressUpdate(datapackId, documentId, traineeId);
        } catch (error) {
            console.error(`[Progress Update Error for ${debounceKey}]:`, error);
        } finally {
            // Clean up the key once the operation is complete
            delete debouncedRecalculation[debounceKey];
        }
    }, 250); // Debounce delay of 250ms
});

const performProgressUpdate = async (datapackId, documentId, traineeId) => {
    // 1. Fetch the document details to know its scope
    const document = await queryDb('SELECT scope FROM documents WHERE id = ?', [documentId]);
    if (!document.length) {
        console.error(`Document with ID ${documentId} not found.`);
        return;
    }
    const isCandidateScope = document[0].scope === 'candidate';

    // 2. Fetch all questions for the document
    const questions = await queryDb('SELECT field_name, input_type, required FROM questionnaires WHERE document_id = ?', [documentId]);
    if (!questions.length) {
        await upsertProgress(datapackId, documentId, traineeId, 100, isCandidateScope);
        return; // No questions, so progress is 100%
    }
    
    // 3. Fetch all responses for the document
    const responses = await queryDb('SELECT field_name, response_data, completed FROM responses WHERE datapack_id = ? AND document_id = ?', [datapackId, documentId]);
    const responseMap = new Map(responses.map(r => [r.field_name, r]));
    
    // 4. Calculate progress
    let completedCount = 0;
    let totalMandatoryQuestions = 0;

    for (const q of questions) {
        if (q.required === 'yes') {
            totalMandatoryQuestions++;
            const response = responseMap.get(q.field_name);

            // A question is considered complete if its 'completed' flag is explicitly 1.
            // This is the most reliable check.
            if (response && response.completed === 1) {
                completedCount++;
                continue; // Move to the next question
            }

            // Fallback for older data or logic errors: check response_data if 'completed' isn't 1.
            // This is the part that needs to be robust.
            if (response && response.response_data) {
                let isComplete = false;
                if (q.input_type === 'upload' && q.allow_multiple) {
                    // An empty array '[]' is not complete.
                    try {
                        const parsed = JSON.parse(response.response_data);
                        isComplete = Array.isArray(parsed) && parsed.length > 0;
                    } catch { isComplete = false; }
                } else if (q.input_type === 'upload' && !q.allow_multiple) {
                    // A non-empty string path is complete.
                    isComplete = typeof response.response_data === 'string' && response.response_data.trim() !== '';
                } else {
                    // For other types, any non-empty string is sufficient.
                    isComplete = String(response.response_data).trim() !== '';
                }

                if (isComplete) {
                    completedCount++;
                }
            }
        }
    }
    
    const completion_percentage = totalMandatoryQuestions > 0 ? Math.round((completedCount / totalMandatoryQuestions) * 100) : 100;

    // 5. Upsert the new progress into the database
    await upsertProgress(datapackId, documentId, traineeId, completion_percentage, isCandidateScope);
    
    // 6. Notify the renderer process of the update
    const activeWindow = BrowserWindow.getAllWindows()[0];
    if (activeWindow) {
        activeWindow.webContents.send('progress-updated', {
            datapackId,
            documentId,
            traineeId,
            progress: completion_percentage
        });
    }
};

const upsertProgress = async (datapackId, documentId, traineeId, completion_percentage, isCandidateScope) => {
    const scopeTraineeId = isCandidateScope ? traineeId : null;

    const existing = await queryDb(
        'SELECT id FROM document_progress WHERE datapack_id = ? AND document_id = ? AND (trainee_id = ? OR (trainee_id IS NULL AND ? IS NULL))',
        [datapackId, documentId, scopeTraineeId, scopeTraineeId]
    );

    if (existing.length > 0) {
        await runDb(
            'UPDATE document_progress SET completion_percentage = ? WHERE id = ?',
            [completion_percentage, existing[0].id]
        );
    } else {
        await runDb(
            'INSERT INTO document_progress (datapack_id, document_id, trainee_id, completion_percentage) VALUES (?, ?, ?, ?)',
            [datapackId, documentId, scopeTraineeId, completion_percentage]
        );
    }
};

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