import { v4 as uuidv4 } from 'uuid';

import type { UploadedAttachment } from 'src/features/attachments';

const getRandomFileSize = () => Math.floor(Math.random() * (2500 - 250 + 1)) + 250;

export interface IGetAttachments {
  count?: number;
  fileSize?: number;
}

export const getAttachments = ({ count = 3, fileSize }: IGetAttachments = {}) => {
  const out: UploadedAttachment[] = [];

  for (let i = 0; i < count; i++) {
    out.push({
      error: undefined,
      uploaded: true,
      deleting: false,
      updating: false,
      data: {
        id: uuidv4(),
        dataType: 'file',
        size: fileSize || getRandomFileSize(),
        filename: `attachment-name-${i}`,
        tags: [`attachment-tag-${i}`],
        created: new Date().toISOString(),
        createdBy: 'test',
        lastChanged: new Date().toISOString(),
        lastChangedBy: 'test',
        blobStoragePath: 'test',
        contentType: 'test',
        locked: false,
        instanceGuid: 'test',
        refs: [],
      },
    });
  }

  return out;
};
