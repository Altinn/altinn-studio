import type { IAttachment } from 'src/shared/resources/attachments';

const getRandomFileSize = () => Math.floor(Math.random() * (2500 - 250 + 1)) + 250;

interface IGetAttachments {
  count?: number;
  fileSize?: number;
}

export const getAttachments = ({ count = 3, fileSize }: IGetAttachments = {}) =>
  Array(count)
    .fill({})
    .map((_, idx) => ({
      name: `attachment-name-${idx}`,
      id: `attachment-id-${idx}`,
      size: fileSize || getRandomFileSize(),
      uploaded: true,
      deleting: false,
      updating: false,
      tags: [`attachment-tag-${idx}`],
    })) as IAttachment[];
