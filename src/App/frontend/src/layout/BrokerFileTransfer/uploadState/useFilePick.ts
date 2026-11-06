import { useCallback, useSyncExternalStore } from 'react';
import type { FileRejection } from 'react-dropzone';

import { fileTypeProblem } from 'src/layout/BrokerFileTransfer/messages';
import {
  getFilePick,
  noPick,
  setFilePick,
  subscribeToFilePicks,
  useUploadsKey,
} from 'src/layout/BrokerFileTransfer/uploadState/uploadStore';

/** Choosing and removing the file and typing its checksum, kept in the upload store until it's sent */
export function useFilePick(baseComponentId: string, allowedFileEndings: string[] | null) {
  const key = useUploadsKey(baseComponentId);
  const getPick = useCallback(() => getFilePick(key), [key]);
  const current = useSyncExternalStore(subscribeToFilePicks, getPick);

  const pick = (accepted: File[], rejected: FileRejection[]) => {
    const picked = [...accepted, ...rejected.map((rejection) => rejection.file)];
    if (picked.length !== 1) {
      setFilePick(key, { ...current, pickError: { key: 'broker_file_transfer.error_one_file' } });
      return;
    }
    setFilePick(key, { ...current, file: picked[0], pickError: fileTypeProblem(rejected, allowedFileEndings) });
  };

  const remove = () => setFilePick(key, { ...noPick, checksum: current.checksum });

  const setChecksum = (checksum: string) => setFilePick(key, { ...current, checksum });

  return { file: current.file, pickError: current.pickError, checksum: current.checksum, pick, remove, setChecksum };
}
