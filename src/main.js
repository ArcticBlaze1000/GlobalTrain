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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
}); 