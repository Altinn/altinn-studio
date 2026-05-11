export const formItemContextProviderMock = {
  formItemId: null,
  formItem: null,
  handleDiscard: jest.fn(),
  handleEdit: jest.fn(),
  handleUpdate: jest.fn(),
  handleSave: jest.fn().mockImplementation(() => Promise.resolve()),
  debounceSave: jest.fn().mockImplementation(() => Promise.resolve()),
};
