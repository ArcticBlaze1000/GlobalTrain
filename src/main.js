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

ipcMain.handle('save-pdf', async (event, payload) => {
    const { htmlContent, eventDetails, documentDetails, traineeDetails, options } = payload;
    
    // 1. Determine the correct directory path
    const documentsPath = app.getPath('documents');
    const baseDir = path.join(documentsPath, 'Global Train Trainers', 'Training');
    const monthFolderName = formatDateForPath(eventDetails.start_date, 'mm. month yyyy');
    const trainerInitial = eventDetails.forename ? eventDetails.forename.charAt(0) : '';
    const specificFolderName = `${formatDateForPath(eventDetails.start_date, 'dd.mm.yyyy')} ${eventDetails.courseName} ${trainerInitial} ${eventDetails.surname}`;
    const candidateBaseDir = path.join(baseDir, monthFolderName, specificFolderName, 'Candidate');

    let finalPath;
    let filename;

    if (documentDetails.scope === 'candidate' && traineeDetails) {
        // This is a candidate-specific document.
        const traineeFolderIndex = (eventDetails.trainee_ids.split(',').indexOf(String(traineeDetails.id)) + 1).toString().padStart(2, '0');
        const candidateFolderName = `${traineeFolderIndex} ${traineeDetails.forename} ${traineeDetails.surname}`;
        finalPath = path.join(candidateBaseDir, candidateFolderName);
        filename = `${traineeDetails.forename}_${traineeDetails.surname}_${documentDetails.name}.pdf`;
    } else {
        // This is a course-level document.
        finalPath = path.join(candidateBaseDir, 'Course Documentation');
        filename = `${documentDetails.name}.pdf`;
    }
    
    // Ensure the directory exists
    try {
        await fs.promises.mkdir(finalPath, { recursive: true });
    } catch (error) {
        console.error('Failed to create directory for PDF:', error);
        return { success: false, error: `Could not create directory at ${finalPath}` };
    }

    const filePath = path.join(finalPath, filename);

    // 2. Generate and save the PDF
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true,
            landscape: options?.landscape || false,
        });
        
        // Optionally, open the folder containing the saved file
        shell.showItemInFolder(filePath);

        return { success: true, filePath };
    } catch (error) {
        console.error('Failed to generate or save PDF with Puppeteer:', error);
        return { success: false, error: error.message };
    } finally {
        if (browser) {
            await browser.close();
        }
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

// Helper for date formatting, ensuring it's available for the check-document-file handler
const formatDateForPath = (date, format) => {
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
    return date.toString(); // Fallback
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  ipcMain.handle('get-documents-path', () => app.getPath('documents'));
  
  ipcMain.handle('initialize-user-session', async (event, user) => {
    if (!user || !user.id) return;

    try {
        let eventsQuery = `
            SELECT d.id, d.course_id, d.trainer_id, c.name AS courseName, d.start_date, d.trainee_ids, u.forename, u.surname, d.status
            FROM datapack d
            JOIN courses c ON d.course_id = c.id
            JOIN users u ON d.trainer_id = u.id
        `;
        
        const queryParams = [];

        if (user.role === 'trainer' || user.role === 'candidate') {
            eventsQuery += ` WHERE d.status = ?`;
            queryParams.push('live');
        }

        const events = await queryDb(eventsQuery, queryParams);
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
    
    if (activeQuestions.length === 0) return 100; // Nothing to complete

    // 3. Count how many active questions are actually complete
    let completedCount = 0;
    const completionStatusMap = new Map();
    for (const q of activeQuestions) {
        const responseData = responseMap[q.field_name];
        let isComplete = false;
        
        switch (q.input_type) {
            case 'checkbox':
                isComplete = responseData === 'true';
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
    // Query to update the overall progress percentage
    dbQueries.push([
        `INSERT INTO document_progress (datapack_id, document_id, trainee_id, completion_percentage) 
         VALUES (?, ?, ?, ?)
         ON CONFLICT(datapack_id, document_id, trainee_id) 
         DO UPDATE SET completion_percentage = excluded.completion_percentage;`,
        [datapackId, documentId, traineeId, percentage]
    ]);
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