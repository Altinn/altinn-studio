const datamodels = require('./datamodels');
const createModel = require('./create-model');

test('should read all models', () => {
  const models = datamodels();
  console.log(models);
});

test('should create model', () => {
  createModel('somename');
});
