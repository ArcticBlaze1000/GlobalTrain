const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const puppeteer = require('puppeteer');

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
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

ipcMain.handle('generate-pdf-from-html', async (event, htmlContent, datapackId) => {
    const documentsPath = app.getPath('documents');
    const filePath = path.join(documentsPath, `register_${datapackId}.pdf`);

    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        // It's crucial to use setContent and wait for the network to be idle
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Generate PDF
        await page.pdf({
            path: filePath,
            format: 'A4',
            printBackground: true, // This is important for Tailwind background colors
            landscape: true, // Match the document orientation
        });

    } catch (error) {
        console.error('Failed to generate PDF with Puppeteer:', error);
        throw error; // Propagate error back to renderer
    } finally {
        if (browser) {
            await browser.close();
        }
    }

    console.log('PDF saved successfully to:', filePath);
    return filePath;
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