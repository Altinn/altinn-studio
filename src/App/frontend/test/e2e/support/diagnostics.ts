declare global {
  interface Window {
    __cypressDiagnosticsProgressAt?: number;
  }
}

// The external watchdog reads this through CDP. Record completed work without
// adding Cypress commands or sending an IPC message for every command.
const runner = window.top;
if (runner && Cypress.expose('cypressDiagnostics')) {
  const progress = () => {
    runner.__cypressDiagnosticsProgressAt = Date.now();
  };
  Cypress.on('command:end', progress);
  Cypress.on('test:before:run', progress);
}

export {};
