// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  run: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  get: (sql, params) => ipcRenderer.invoke('db-get', sql, params),
  transaction: (queries) => ipcRenderer.invoke('db-transaction', queries)
});

contextBridge.exposeInMainWorld('electron', {
  recalculateAndUpdateProgress: (args) => ipcRenderer.invoke('recalculate-and-update-progress', args),
  onProgressUpdate: (callback) => ipcRenderer.on('progress-updated', callback),
  initializeUserSession: (user) => ipcRenderer.invoke('initialize-user-session', user),
  savePdf: (payload) => ipcRenderer.invoke('save-pdf', payload),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
  getLogoBase64: () => ipcRenderer.invoke('get-logo-base64'),
  getCssPath: () => ipcRenderer.invoke('get-css-path'),
  quitApp: () => ipcRenderer.invoke('app-quit')
});

window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const dependency of ['chrome', 'node', 'electron']) {
    replaceText(`${dependency}-version`, process.versions[dependency])
  }
}) 