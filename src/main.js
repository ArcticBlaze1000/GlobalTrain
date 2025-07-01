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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  ipcMain.handle('get-documents-path', () => app.getPath('documents'));
  ipcMain.handle('ensure-event-folder-exists', async (event, { courseName, startDate, trainerName, candidates, nonMandatoryFolders }) => {
    const fs = require('fs/promises');
    const path = require('path');
    
    // --- Create Base Event Folder ---
    const [year, month, day] = startDate.split('-');
    const formattedDate = `${day}-${month}-${year}`;
    const folderName = `${courseName} - ${formattedDate} - ${trainerName}`;
    const docsPath = app.getPath('documents');
    const eventPath = path.join(docsPath, 'Global Train Events', folderName);

    try {
      // --- Create Admin Folders ---
      const adminPath = path.join(eventPath, '00 Admin');
      const adminSubfolders = [
        '1. Email Confirmation to Sponsor',
        '2. Booking Form',
        '3. Joining Instructions',
        '4. Sub Sponsorship Paperwork',
        '5. Sentinel Report',
        '6. Sponsor Notification of Results'
      ];
      for (const subfolder of adminSubfolders) {
        await fs.mkdir(path.join(adminPath, subfolder), { recursive: true });
      }

      // --- Create Candidate Folders ---
      const candidateBasePath = path.join(eventPath, '06 Candidate');
      if (candidates && candidates.length > 0) {
        for (let i = 0; i < candidates.length; i++) {
          const candidate = candidates[i];
          const candidateName = `${candidate.forename} ${candidate.surname}`;
          // Pad number with leading zero
          const folderPrefix = String(i + 1).padStart(2, '0');
          await fs.mkdir(path.join(candidateBasePath, `${folderPrefix} ${candidateName}`), { recursive: true });
        }
      } else {
        await fs.mkdir(candidateBasePath, { recursive: true });
      }

      // --- Create Non-Mandatory Folders ---
      const nonMandatoryPath = path.join(eventPath, 'Non Mandatory Files');
      if (nonMandatoryFolders && nonMandatoryFolders.length > 0) {
        for (const subfolder of nonMandatoryFolders) {
          await fs.mkdir(path.join(nonMandatoryPath, subfolder), { recursive: true });
        }
      } else {
        await fs.mkdir(nonMandatoryPath, { recursive: true });
      }

      return { success: true, path: eventPath };
    } catch (error) {
      console.error(`Failed to create folder structure for event "${folderName}":`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('audit-event-folders', async (event, { eventPath, numTrainees, numSponsors }) => {
    const fs = require('fs/promises');
    const path = require('path');
    const results = {};

    const adminChecklist = {
      '1. Email Confirmation to Sponsor': numSponsors,
      '2. Booking Form': numSponsors,
      '3. Joining Instructions': numTrainees,
      '4. Sub Sponsorship Paperwork': 0,
      '5. Sentinel Report': 1,
      '6. Sponsor Notification of Results': 1
    };

    const adminPath = path.join(eventPath, '00 Admin');

    for (const [folder, expectedCount] of Object.entries(adminChecklist)) {
      const folderPath = path.join(adminPath, folder);
      try {
        const files = await fs.readdir(folderPath);
        // Filter out system files like .DS_Store
        const actualFiles = files.filter(f => !f.startsWith('.'));
        const count = actualFiles.length;
        // Show a cross for 0/0, but a tick for 1/1, 2/1, etc.
        const isComplete = count >= expectedCount;
        const status = isComplete && !(count === 0 && expectedCount === 0) ? '✅' : '❌';

        results[folder] = {
          count,
          expected: expectedCount,
          status: status
        };
      } catch (error) {
        // If folder doesn't exist, count is 0
        results[folder] = {
          count: 0,
          expected: expectedCount,
          // A missing folder for a 0-requirement item should show a cross
          status: '❌'
        };
      }
    }
    return results;
  });

  ipcMain.handle('check-non-mandatory-document-count', async (event, { courseName, startDate, trainerName, documentName, expectedCount }) => {
    const fs = require('fs/promises');
    const path = require('path');
    
    try {
      // Build the path to the specific non-mandatory document folder
      const [year, month, day] = startDate.split('-');
      const formattedDate = `${day}-${month}-${year}`;
      const folderName = `${courseName} - ${formattedDate} - ${trainerName}`;
      const docsPath = app.getPath('documents');
      const documentFolderPath = path.join(docsPath, 'Global Train Events', folderName, 'Non Mandatory Files', documentName);
      
      // Count files in the folder
      const files = await fs.readdir(documentFolderPath);
      // Filter out system files like .DS_Store
      const actualFiles = files.filter(f => !f.startsWith('.'));
      const count = actualFiles.length;
      
      // For non-mandatory docs: exactly expected count = ✅, otherwise ❌
      const status = count === expectedCount ? '✅' : '❌';
      
      return {
        count,
        expected: expectedCount,
        status,
        folderPath: documentFolderPath
      };
    } catch (error) {
      // If folder doesn't exist or can't be read, count is 0
      return {
        count: 0,
        expected: expectedCount,
        status: '❌',
        error: error.message
      };
    }
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