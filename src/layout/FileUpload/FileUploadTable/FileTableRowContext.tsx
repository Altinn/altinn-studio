import { createStrictContext } from 'src/utils/createContext';

export interface FileTableRowContext {
  index: number;
  editIndex: number;
  setEditIndex: (index: number) => void;
}

const { Provider, useCtx } = createStrictContext<FileTableRowContext>({ name: 'FileTableRowContext' });

export const FileTableRowProvider = Provider;
export const useFileTableRow = () => useCtx();
