const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const puppeteer = require('puppeteer');

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

ipcMain.handle('app-quit', () => {
    app.quit();
});

// Helper function to run a database query and return a promise
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

// Helper function for date formatting
const formatDate = (date, format) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const monthName = d.toLocaleString('default', { month: 'long' });

    if (format === 'mm. month yyyy') {
        return `${month}. ${monthName} ${year}`;
    }
    if (format === 'dd.mm.yyyy') {
        return `${day}.${month}.${year}`;
    }
    return date;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  ipcMain.handle('get-documents-path', () => app.getPath('documents'));
  
  ipcMain.handle('initialize-user-session', async (event, user) => {
    if (!user || !user.id) return;

    try {
        // 1. Fetch all events from the database, regardless of the user.
        const eventsQuery = `
            SELECT d.id, d.course_id, d.trainer_id, c.name AS courseName, d.start_date, d.trainee_ids, u.forename, u.surname
            FROM datapack d
            JOIN courses c ON d.course_id = c.id
            JOIN users u ON d.trainer_id = u.id
        `;

        const events = await queryDb(eventsQuery);
        const documentsPath = app.getPath('documents');
        const baseDir = path.join(documentsPath, 'Global Train Trainers', 'Training');

        // 2. Loop through each event and ensure its folder structure exists.
        for (const event of events) {
            // 2a. Create month and specific event folders
            const monthFolderName = formatDate(event.start_date, 'mm. month yyyy');
            const trainerInitial = event.forename ? event.forename.charAt(0) : '';
            const specificFolderName = `${formatDate(event.start_date, 'dd.mm.yyyy')} ${event.courseName} ${trainerInitial} ${event.surname}`;
            const eventDir = path.join(baseDir, monthFolderName, specificFolderName);

            // 2b. Create Admin subfolders
            const adminDir = path.join(eventDir, 'Admin');
            const bookingFormDir = path.join(adminDir, 'Booking Form and Joining Instructions');
            const subSponsorDir = path.join(adminDir, 'Sub Sponsor Request');

            // 2c. Create Candidate subfolders
            const candidateDir = path.join(eventDir, 'Candidate');
            const courseDocsDir = path.join(candidateDir, 'Course Documentation');
            const exercisesDir = path.join(candidateDir, 'Additional Exercsies Contents');

            fs.mkdirSync(bookingFormDir, { recursive: true });
            fs.mkdirSync(subSponsorDir, { recursive: true });
            fs.mkdirSync(courseDocsDir, { recursive: true });
            fs.mkdirSync(exercisesDir, { recursive: true });

            // 2d. Create numbered folders for each candidate
            if (event.trainee_ids) {
                const traineeIds = event.trainee_ids.split(',');
                const trainees = await queryDb(`SELECT forename, surname FROM trainees WHERE id IN (${traineeIds.map(() => '?').join(',')})`, traineeIds);
                
                trainees.forEach((trainee, index) => {
                    const candidateFolderName = `${String(index + 1).padStart(2, '0')} ${trainee.forename} ${trainee.surname}`;
                    const specificCandidateDir = path.join(candidateDir, candidateFolderName);
                    fs.mkdirSync(specificCandidateDir, { recursive: true });
                });
            }
        }
    } catch (error) {
        console.error('Failed during user session initialization:', error);
        // Optionally, you could return an error to the renderer process
    }
  });
  
  ipcMain.handle('recalculate-and-update-progress', async (event, { datapackId, documentId, traineeId = null }) => {
    // Fetch datapack details first to get duration and trainee IDs
    const datapack = await new Promise((resolve, reject) => {
        db.get('SELECT trainee_ids, duration FROM datapack WHERE id = ?', [datapackId], (err, row) => {
            if (err) reject(err); else resolve(row);
        });
    });
    const traineeIds = datapack?.trainee_ids ? datapack.trainee_ids.split(',') : [];
    const eventDuration = datapack?.duration || 0;

    // 1. Get all questions for the document.
    const questions = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM questionnaires WHERE document_id = ?', [documentId], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });

    if (questions.length === 0) {
        return 100;
    }

    // 2. Get all responses for this document within this datapack.
    const responseRows = await new Promise((resolve, reject) => {
        const sql = `SELECT field_name, response_data FROM responses WHERE datapack_id = ? AND document_id = ?`;
        db.all(sql, [datapackId, documentId], (err, rows) => {
            if (err) reject(err); else resolve(rows);
        });
    });
    
    // Create a map for easy lookup of responses.
    const responseMap = responseRows.reduce((acc, row) => {
        acc[row.field_name] = row;
        return acc;
    }, {});

    // 3. Determine which questions are currently required, respecting event duration and dependencies.
    const activeQuestions = [];
    for (const q of questions) {
        // For day-based questions, only include them if they are within the event's duration.
        if (q.field_name.startsWith('day_')) {
            const dayNumber = parseInt(q.field_name.split('_')[1], 10);
            if (!isNaN(dayNumber) && dayNumber > eventDuration) {
                continue; // Skip questions for days beyond the event's duration.
            }
        }

        if (q.required === 'yes') {
            activeQuestions.push(q);
        } else if (q.required === 'dependant' && q.dependency) {
            const dependencyResponse = responseMap[q.dependency]?.response_data;
            // A dependency is now met if the response is non-empty.
            if (dependencyResponse && String(dependencyResponse).trim() !== '') {
                activeQuestions.push(q);
            }
        }
    }

    if (activeQuestions.length === 0) {
        return 100; // No required questions, so it's 100% complete.
    }

    // 4. Count how many of the active questions are completed and track their status.
    let completedCount = 0;
    const completionStatusMap = new Map();

    for (const q of activeQuestions) {
        const response = responseMap[q.field_name];
        let isComplete = false;

        if (response) {
            switch (q.input_type) {
                case 'checkbox':
                    isComplete = response.response_data === 'true';
                    break;
                case 'tri_toggle':
                    isComplete = response.response_data !== 'neutral' && response.response_data !== '';
                    break;
                case 'attendance_grid':
                case 'trainee_checkbox_grid':
                case 'trainee_date_grid':
                case 'trainee_dropdown_grid':
                case 'trainee_yes_no_grid':
                case 'signature_grid':
                    try {
                        const gridData = JSON.parse(response.response_data || '{}');
                        isComplete = traineeIds.every(id => gridData[id] !== undefined && gridData[id] !== '');
                    } catch {
                        isComplete = false;
                    }
                    break;
                default:
                    isComplete = response.response_data && String(response.response_data).trim() !== '';
                    break;
            }
        }

        completionStatusMap.set(q.field_name, isComplete);
        if (isComplete) {
            completedCount++;
        }
    }
    
    // 5. Calculate percentage.
    const percentage = activeQuestions.length > 0 ? Math.round((completedCount / activeQuestions.length) * 100) : 100;

    // 6. Build a transaction to update both document_progress and the responses completed flag.
    const queries = [];

    // Query for the document_progress table
    queries.push([
        `INSERT INTO document_progress (datapack_id, document_id, trainee_id, completion_percentage) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(datapack_id, document_id, trainee_id) 
         DO UPDATE SET completion_percentage = excluded.completion_percentage;`,
        [datapackId, documentId, traineeId, percentage]
    ]);

    // Queries for the responses table
    for (const [fieldName, isComplete] of completionStatusMap.entries()) {
        queries.push([
            `UPDATE responses SET completed = ? WHERE datapack_id = ? AND document_id = ? AND field_name = ?`,
            [isComplete ? 1 : 0, datapackId, documentId, fieldName]
        ]);
    }
    
    // Execute the transaction
    await new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    console.error('TRANSACTION START FAILED:', err);
                    return reject(err);
                }
                for (const [sql, params] of queries) {
                    db.run(sql, params, function(err) {
                        if (err) {
                            console.error('TRANSACTION QUERY FAILED:', err, sql, params);
                            db.run('ROLLBACK');
                            return reject(err);
                        }
                    });
                }
                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('TRANSACTION COMMIT FAILED:', err);
                        db.run('ROLLBACK');
                        return reject(err);
                    }
                    
                    // After a successful commit, send the new progress to the renderer.
                    const window = BrowserWindow.getFocusedWindow();
                    if (window) {
                        window.webContents.send('progress-updated', {
                            datapackId,
                            documentId,
                            traineeId,
                            progress: percentage
                        });
                    }

                    resolve();
                });
            });
        });
    });

    return percentage;
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