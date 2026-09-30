import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { selectUploadedAttachments } from 'src/features/attachments/tools';
import type { AttachmentNode } from 'src/features/attachments/tools';
import type { FormStoreState } from 'src/features/form/FormContext';
import type { IData } from 'src/types/shared';

const dataType = 'test-data-type-1';
const attachment = getInstanceDataMock().data.find((data) => data.dataType === 'ref-data-as-pdf')!;
const application = getApplicationMetadataMock();

function dataElement(id: string): IData {
  return { ...attachment, id, dataType, filename: `${id}.pdf` };
}

function stateWithCurrentData(currentData: object): FormStoreState {
  return {
    data: {
      models: {
        [dataType]: {
          debouncedCurrentData: currentData,
        },
      },
    },
  } as unknown as FormStoreState;
}

function node(dataModelBindings: AttachmentNode['dataModelBindings']): AttachmentNode {
  return {
    id: dataType,
    baseId: dataType,
    dataModelBindings,
  };
}

describe('selectUploadedAttachments', () => {
  it('does not fall back to unbound attachments for an empty simple binding', () => {
    const attachments = selectUploadedAttachments(
      node({ simpleBinding: { dataType, field: 'attachmentId' } }),
      stateWithCurrentData({}),
      [dataElement('attachment-1')],
      application,
    );

    expect(attachments).toEqual([]);
  });

  it('returns the attachment matching a simple binding value', () => {
    const attachments = selectUploadedAttachments(
      node({ simpleBinding: { dataType, field: 'attachmentId' } }),
      stateWithCurrentData({ attachmentId: 'attachment-1' }),
      [dataElement('attachment-1'), dataElement('attachment-2')],
      application,
    );

    expect(attachments.map((attachment) => attachment.data.id)).toEqual(['attachment-1']);
  });

  it('does not fall back to unbound attachments for an empty list binding', () => {
    const attachments = selectUploadedAttachments(
      node({ list: { dataType, field: 'attachmentIds' } }),
      stateWithCurrentData({ attachmentIds: [] }),
      [dataElement('attachment-1')],
      application,
    );

    expect(attachments).toEqual([]);
  });

  it('keeps unbound attachments visible for unbound uploaders', () => {
    const attachments = selectUploadedAttachments(
      node(undefined),
      stateWithCurrentData({}),
      [dataElement('attachment-1')],
      application,
    );

    expect(attachments.map((attachment) => attachment.data.id)).toEqual(['attachment-1']);
  });
});
