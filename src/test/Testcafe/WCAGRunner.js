const createTestCafe = require('testcafe');
const fs = require('fs');
let testcafe = null;

createTestCafe()
  .then((tc) => {
    testcafe = tc;
    const runner = testcafe.createRunner();

    return runner
      .browsers(['chrome:headless'])
      .concurrency(1)
      .screenshots('./screenshots', { takeOnFails: false })
      .reporter('spec')
      .src(['./wcag/*.js'])
      .run({
        skipJsErrors: true,
        skipUncaughtErrors: true,
        quarantineMode: false,
        selectorTimeout: 15000,
        assertionTimeout: 15000,
        pageLoadTimeout: 5000,
        speed: 1,
        debugOnFail: false,
        stopOnFirstFail: false,
      })
      .then((failedCount) => {
        console.log('Total tests failed ' + failedCount);
      });
  })
  .then(() => {
    testcafe.close();
  });
