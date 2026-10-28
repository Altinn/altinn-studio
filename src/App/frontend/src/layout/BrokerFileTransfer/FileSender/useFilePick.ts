import { useCallback, useSyncExternalStore } from 'react';
import type { FileRejection } from 'react-dropzone';

import {
  getFilePick,
  noPick,
  setFilePick,
  subscribeToFilePicks,
  useUploadsKey,
} from 'src/layout/BrokerFileTransfer/brokerUploads';
import { fileTypeProblem } from 'src/layout/BrokerFileTransfer/messages';

function useCurrentPick(baseComponentId: string) {
  const key = useUploadsKey(baseComponentId);
  const getPick = useCallback(() => getFilePick(key), [key]);
  return { key, current: useSyncExternalStore(subscribeToFilePicks, getPick) };
}

export function useChosenFile(baseComponentId: string): File | null {
  return useCurrentPick(baseComponentId).current.file;
}

export function useFilePick(baseComponentId: string, allowedFileEndings: string[] | null) {
  const { key, current } = useCurrentPick(baseComponentId);

  const pick = (accepted: File[], rejected: FileRejection[]) => {
    const picked = [...accepted, ...rejected.map((rejection) => rejection.file)];
    if (picked.length !== 1) {
      setFilePick(key, { ...current, pickError: { key: 'broker_file_transfer.error_one_file' } });
      return;
    }
    setFilePick(key, { file: picked[0], pickError: fileTypeProblem(rejected, allowedFileEndings) });
  };

  const remove = () => setFilePick(key, noPick);

  return { file: current.file, pickError: current.pickError, pick, remove };
}
