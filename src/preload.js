const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openclaude', {
  getConfig: () => ipcRenderer.invoke('config:get'),
  applyConfig: (cfg) => ipcRenderer.invoke('config:apply', cfg),
  restoreOfficial: () => ipcRenderer.invoke('config:restore'),
  getDesktopConfig: () => ipcRenderer.invoke('desktop:get'),
  applyDesktopConfig: (cfg) => ipcRenderer.invoke('desktop:apply', cfg),
  restoreDesktopConfig: () => ipcRenderer.invoke('desktop:restore'),
  proxyStatus: () => ipcRenderer.invoke('proxy:status'),
  fetchModels: (args) => ipcRenderer.invoke('provider:models', args),
  testConnection: (args) => ipcRenderer.invoke('provider:test', args)
});
