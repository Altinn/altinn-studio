const createTestCafe = require('testcafe');
const fs = require('fs');
let testcafe = null;

createTestCafe()
  .then(tc => {
    testcafe = tc;
    const runner = testcafe.createRunner();
    const stream = fs.createWriteStream('testcafe.xml');

    return runner
      .browsers(['chrome:headless'])
      .concurrency(1)
      //.speed(0.75)
      .screenshots('./screenshots', { takeOnFails: false })
      .reporter('xUnit', stream)
      .src(['./repository_tests/login_create_new_repo.js'])
      .run({
        skipJsErrors: true,
        quarantineMode: false,
        selectorTimeout: 2000,
        assertionTimeout: 1000,
        pageLoadTimeout: 1000,
        speed: 1,
        debugOnFail: false,
        stopOnFirstFail: true
      })
      .then(failedCount => {
        console.log('Total tests failed ' + failedCount);
        stream.end();
      })
  })
  .then(() => {
    testcafe.close();
  });
