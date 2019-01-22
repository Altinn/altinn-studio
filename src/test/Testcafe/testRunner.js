const createTestCafe = require('testcafe');
const fs = require('fs');
let testcafe = null;

createTestCafe()
  .then(tc => {
    testcafe = tc;
    const runner = testcafe.createRunner();
    const stream = fs.createWriteStream('junit.xml');

    return runner
      .browsers(['chrome:headless'])
      .concurrency(1)
      //.speed(0.75)
      .screenshots('./screenshots', { takeOnFails: true })
      .reporter('junit', stream)
      .src(['./designer_tests/navigation-tests.js'])
      .run({
        skipJsErrors: true,
        quarantineMode: false,
        selectorTimeout: 5000,
        assertionTimeout: 5000,
        pageLoadTimeout: 5000,
        speed: 1,
        debugOnFail: true,
        stopOnFirstFail: false
      })
      .then(failedCount => {
        console.log('Total tests failed ' + failedCount);
        stream.end();
      })
  })
  .then(() => {
    testcafe.close();
  });
