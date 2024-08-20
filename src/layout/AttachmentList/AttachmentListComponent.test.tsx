import React from 'react';

import { expect } from '@jest/globals';
import { screen } from '@testing-library/react';
import type { jest } from '@jest/globals';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { fetchApplicationMetadata } from 'src/queries/queries';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IData } from 'src/types/shared';

describe('AttachmentListComponent', () => {
  it('should render specific attachments without pdf', async () => {
    await render(['not-ref-data-as-pdf', 'different-process-task']);
    expect(screen.getByText('2mb')).toBeInTheDocument();
    expect(screen.getByText('differentTask')).toBeInTheDocument();
    expect(screen.queryByText('testData1')).not.toBeInTheDocument();
  });
  it('should render only pdf attachments', async () => {
    await render(['ref-data-as-pdf']);
    expect(screen.getByText('testData1')).toBeInTheDocument();
    expect(screen.queryByText('2mb')).not.toBeInTheDocument();
    expect(screen.queryByText('differentTask')).not.toBeInTheDocument();
  });
  it('should render all attachments', async () => {
    await render(['include-all']);
    expect(screen.getByText('2mb')).toBeInTheDocument();
    expect(screen.getByText('differentTask')).toBeInTheDocument();
    expect(screen.getByText('testData1')).toBeInTheDocument();
  });
  it('should render all attachments without pdf and log error', async () => {
    await render();
    expect(screen.getByText('2mb')).toBeInTheDocument();
    expect(screen.getByText('differentTask')).toBeInTheDocument();
    expect(screen.queryByText('testData1')).not.toBeInTheDocument();
  });
  it('should render attachments from current task without pdf', async () => {
    await render(['from-task']);
    expect(screen.getByText('2mb')).toBeInTheDocument();
    expect(screen.queryByText('differentTask')).not.toBeInTheDocument();
    expect(screen.queryByText('testData1')).not.toBeInTheDocument();
  });
});

const render = async (ids?: string[]) => {
  (fetchApplicationMetadata as jest.Mock<typeof fetchApplicationMetadata>).mockImplementationOnce(() =>
    Promise.resolve(
      getIncomingApplicationMetadataMock((a) => {
        a.dataTypes.push(
          generateDataType({ id: 'not-ref-data-as-pdf', dataType: 'text/plain', taskId: 'Task_1' }),
          generateDataType({
            id: 'different-process-task',
            dataType: 'text/plain',
            taskId: 'Task_2',
          }),
        );
      }),
    ),
  );
  return await renderGenericComponentTest({
    type: 'AttachmentList',
    renderer: (props) => <AttachmentListComponent {...props} />,
    component: {
      dataTypeIds: ids,
      textResourceBindings: {
        title: 'Attachments',
      },
    },
    queries: {
      fetchInstanceData: async () =>
        getInstanceDataMock((i) => {
          i.data.push(
            generateDataElement({
              id: 'test-data-type-1',
              dataType: 'ref-data-as-pdf',
              filename: 'testData1.pdf',
              contentType: 'application/pdf',
            }),
            generateDataElement({
              id: 'test-data-type-2',
              dataType: 'not-ref-data-as-pdf',
              filename: '2mb.txt',
              contentType: 'text/plain',
            }),
            generateDataElement({
              id: 'test-data-type-3',
              dataType: 'different-process-task',
              filename: 'differentTask.pdf',
              contentType: 'text/plain',
            }),
          );
        }),
    },
  });
};

interface GenerateDataElementProps {
  id: string;
  dataType: string;
  filename: string;
  contentType: string;
}

const generateDataElement = ({ id, dataType, filename, contentType }: GenerateDataElementProps): IData => ({
  id,
  instanceGuid: 'mockInstanceGuid',
  dataType,
  filename,
  contentType,
  blobStoragePath: '',
  size: 1234,
  locked: false,
  refs: [],
  created: new Date('2021-01-01').toISOString(),
  createdBy: 'testUser',
  lastChanged: new Date('2021-01-01').toISOString(),
  lastChangedBy: 'testUser',
});

interface GenerateDataTypeProps {
  id: string;
  dataType: string;
  taskId: string;
}

const generateDataType = ({ id, dataType, taskId }: GenerateDataTypeProps) => ({
  id,
  taskId,
  allowedContentTypes: [dataType],
  maxSize: 5,
  maxCount: 3,
  minCount: 0,
  enablePdfCreation: true,
  enableFileScan: false,
  validationErrorOnPendingFileScan: false,
  enabledFileAnalysers: ['mimeTypeAnalyser'],
  enabledFileValidators: ['mimeTypeValidator'],
});
