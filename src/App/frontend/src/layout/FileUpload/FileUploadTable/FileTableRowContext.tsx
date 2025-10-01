import { createContext } from 'src/core/contexts/context';

export interface FileTableRowContext {
  index: number;
  editIndex: number;
  setEditIndex: (index: number) => void;
}

const { Provider, useCtx } = createContext<FileTableRowContext>({ name: 'FileTableRowContext', required: true });

export const FileTableRowProvider = Provider;
export const useFileTableRow = () => useCtx();
