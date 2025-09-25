import { v4 as uuidv4 } from 'uuid';

import type { UploadedAttachment } from 'src/features/attachments';
import type { IData } from 'src/types/shared';

const getRandomFileSize = () => Math.floor(Math.random() * (2500 - 250 + 1)) + 250;

export interface IGetAttachmentsMock {
  count?: number;
  fileSize?: number;
}

export const getAttachmentsMock = ({ count = 3, fileSize }: IGetAttachmentsMock = {}) => {
  const out: UploadedAttachment[] = [];

  for (let i = 0; i < count; i++) {
    out.push(
      getAttachmentMock({
        data: getAttachmentDataMock({
          size: fileSize || getRandomFileSize(),
          filename: `attachment-name-${i}`,
          tags: [`attachment-tag-${i}`],
        }),
      }),
    );
  }

  return out;
};

export const getAttachmentDataMock = (overrides: Partial<IData> = {}): IData => ({
  id: uuidv4(),
  dataType: 'file',
  size: getRandomFileSize(),
  filename: 'attachment-name',
  tags: ['attachment-tag-'],
  created: new Date().toISOString(),
  createdBy: 'test',
  lastChanged: new Date().toISOString(),
  lastChangedBy: 'test',
  blobStoragePath: 'test',
  contentType: 'test',
  locked: false,
  instanceGuid: 'test',
  refs: [],
  ...overrides,
});

export const getAttachmentMock = (overrides: Partial<UploadedAttachment> = {}): UploadedAttachment => ({
  error: undefined,
  uploaded: true,
  deleting: false,
  updating: false,
  data: getAttachmentDataMock(overrides.data),
  ...overrides,
});
