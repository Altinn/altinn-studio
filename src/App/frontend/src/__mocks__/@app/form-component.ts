const actual = jest.requireActual<typeof import('@app/form-component')>('@app/form-component');

module.exports = {
  __esModule: true,
  ...actual,
  getDateFormat: jest.fn(() => 'dd.MM.yyyy'),
};
