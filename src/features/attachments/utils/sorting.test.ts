import { getAttachmentDataMock, getAttachmentMock } from 'src/__mocks__/getAttachmentsMock';
import { mergeAndSort } from 'src/features/attachments/utils/sorting';

const multiInSecondRow1 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'multiInSecondRow1.pdf' }) });
const multiInSecondRow2 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'multiInSecondRow2.pdf' }) });
const multiInSecondRow3 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'multiInSecondRow3.pdf' }) });
const multiInSecondRow4 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'multiInSecondRow4.pdf' }) });

const nestedRow1Sub01 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'nested-row1-sub0-1.pdf' }) });
const nestedRow1Sub02 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'nested-row1-sub0-2.pdf' }) });
const nestedRow1Sub03 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'nested-row1-sub0-3.pdf' }) });
const nestedRow1Sub11 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'nested-row1-sub1-1.pdf' }) });
const nestedRow1Sub13 = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'nested-row1-sub1-3.pdf' }) });

const singeFileInSndRow = getAttachmentMock({ data: getAttachmentDataMock({ filename: 'singleFileInSecondRow.pdf' }) });

describe('mergeAndSort', () => {
  it('should sort attachments', () => {
    const postUpload = {
      'mainUploaderMulti-0': [multiInSecondRow3, multiInSecondRow1, multiInSecondRow4, multiInSecondRow2],
      'subUploader-0-1': [nestedRow1Sub13, nestedRow1Sub11],
      'mainUploaderSingle-0': [singeFileInSndRow],
      'subUploader-0-0': [nestedRow1Sub01, nestedRow1Sub03, nestedRow1Sub02],
    };

    const expected = {
      'mainUploaderMulti-0': [multiInSecondRow1, multiInSecondRow2, multiInSecondRow3, multiInSecondRow4],
      'mainUploaderSingle-0': [singeFileInSndRow],
      'subUploader-0-1': [nestedRow1Sub11, nestedRow1Sub13],
      'subUploader-0-0': [nestedRow1Sub01, nestedRow1Sub02, nestedRow1Sub03],
    };

    const result = mergeAndSort({}, postUpload);
    expect(result).toEqual(expected);
  });
});
