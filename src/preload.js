const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openclaude', {
  detectInstall: () => ipcRenderer.invoke('claude:detect'),
  browseDesktop: () => ipcRenderer.invoke('claude:browse-desktop'),
  copilotAuthStart: () => ipcRenderer.invoke('copilot:auth-start'),
  copilotAuthPoll: () => ipcRenderer.invoke('copilot:auth-poll'),
  copilotAuthStatus: () => ipcRenderer.invoke('copilot:auth-status'),
  copilotAuthClear: () => ipcRenderer.invoke('copilot:auth-clear'),
  getConfig: () => ipcRenderer.invoke('config:get'),
  applyConfig: (cfg) => ipcRenderer.invoke('config:apply', cfg),
  restoreOfficial: () => ipcRenderer.invoke('config:restore'),
  getDesktopConfig: () => ipcRenderer.invoke('desktop:get'),
  applyDesktopConfig: (cfg) => ipcRenderer.invoke('desktop:apply', cfg),
  restoreDesktopConfig: () => ipcRenderer.invoke('desktop:restore'),
  uninstall: () => ipcRenderer.invoke('app:uninstall'),
  proxyStatus: () => ipcRenderer.invoke('proxy:status'),
  fetchModels: (args) => ipcRenderer.invoke('provider:models', args),
  testConnection: (args) => ipcRenderer.invoke('provider:test', args)
});
