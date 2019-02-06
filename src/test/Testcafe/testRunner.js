const createTestCafe = require('testcafe');
const fs = require('fs');
let testcafe = null;

createTestCafe()
  .then(tc => {
    testcafe = tc;
    const runner = testcafe.createRunner();
    const stream = fs.createWriteStream('junit.xml');

    return runner
      .browsers(['chrome'])
      .concurrency(1)
      //.speed(0.75)
      .screenshots('./screenshots', { takeOnFails: true })
      .reporter('junit', stream)
      .src(['./dashboard_tests/service-tests.js'])
      .run({
        skipJsErrors: true,
        quarantineMode: false,
        selectorTimeout: 15000,
        assertionTimeout: 15000,
        pageLoadTimeout: 10000,
        speed: 0.75,
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
