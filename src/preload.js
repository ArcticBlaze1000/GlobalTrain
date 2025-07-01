// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  query: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  run: (sql, params) => ipcRenderer.invoke('db-run', sql, params),
  get: (sql, params) => ipcRenderer.invoke('db-get', sql, params),
  transaction: (queries) => ipcRenderer.invoke('db-transaction', queries),
});

contextBridge.exposeInMainWorld('electron', {
  generatePdfFromHtml: (htmlContent, datapackId, options) => ipcRenderer.invoke('generate-pdf-from-html', htmlContent, datapackId, options),
  getCssPath: () => ipcRenderer.invoke('get-css-path'),
  getLogoBase64: () => ipcRenderer.invoke('get-logo-base64'),
  quitApp: () => ipcRenderer.invoke('app-quit'),
  getDocumentsPath: () => ipcRenderer.invoke('get-documents-path'),
  ensureEventFolderExists: (eventDetails) => ipcRenderer.invoke('ensure-event-folder-exists', eventDetails),
  auditEventFolders: (auditDetails) => ipcRenderer.invoke('audit-event-folders', auditDetails),
  checkNonMandatoryDocumentCount: (checkDetails) => ipcRenderer.invoke('check-non-mandatory-document-count', checkDetails),
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