import { vi } from 'vitest';
export const formItemContextProviderMock = {
  formItemId: null,
  formItem: null,
  handleDiscard: vi.fn(),
  handleEdit: vi.fn(),
  handleUpdate: vi.fn(),
  handleSave: vi.fn().mockImplementation(() => Promise.resolve()),
  debounceSave: vi.fn().mockImplementation(() => Promise.resolve()),
};
