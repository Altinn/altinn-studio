const diagnosticsUrl = Cypress.expose('CYPRESS_DIAGNOSTICS_URL');
if (diagnosticsUrl) {
  Cypress.on('test:after:run', (attributes, test) => {
    // Ordinary Cypress retries retain their existing semantics. Only a final
    // failure must survive restarting an interrupted spec from the beginning.
    if (attributes.state === 'failed' && Cypress.currentRetry >= test.retries()) {
      navigator.sendBeacon(diagnosticsUrl, JSON.stringify({ spec: Cypress.spec.relative, title: test.fullTitle() }));
    }
  });
}
