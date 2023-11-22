import React from 'react';

import { screen } from '@testing-library/react';

import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IData } from 'src/types/shared';

describe('AttachmentListComponent', () => {
  beforeEach(() => {
    jest.spyOn(window, 'logErrorOnce').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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

    // We know this happens, because we don't have any uploader components available for this data type
    expect(window.logErrorOnce).toHaveBeenCalledWith(
      'Could not find matching component/node for attachment not-ref-data-as-pdf/test-data-type-2 ' +
        '(there may be a problem with the mapping of attachments to form data in a repeating group). ' +
        'Traversed 0 nodes with id not-ref-data-as-pdf',
    );
  });
  it('should render attachments from current task without pdf', async () => {
    await render(['from-task']);
    expect(screen.getByText('2mb')).toBeInTheDocument();
    expect(screen.queryByText('differentTask')).not.toBeInTheDocument();
    expect(screen.queryByText('testData1')).not.toBeInTheDocument();
  });
});

const render = async (ids?: string[]) =>
  await renderGenericComponentTest({
    type: 'AttachmentList',
    renderer: (props) => <AttachmentListComponent {...props} />,
    component: {
      dataTypeIds: ids,
      textResourceBindings: {
        title: 'Attachments',
      },
    },
    reduxState: getInitialStateMock((state) => {
      if (state.deprecated.lastKnownInstance) {
        const dataElement1 = generateDataElement({
          id: 'test-data-type-1',
          dataType: 'ref-data-as-pdf',
          filename: 'testData1.pdf',
          contentType: 'application/pdf',
        });
        const dataElement2 = generateDataElement({
          id: 'test-data-type-2',
          dataType: 'not-ref-data-as-pdf',
          filename: '2mb.txt',
          contentType: 'text/plain',
        });
        const dataElement3 = generateDataElement({
          id: 'test-data-type-3',
          dataType: 'different-process-task',
          filename: 'differentTask.pdf',
          contentType: 'text/plain',
        });
        state.deprecated.lastKnownInstance.data.push(...[dataElement1, dataElement2, dataElement3]);
      }
      if (state.applicationMetadata.applicationMetadata) {
        const dataType1 = generateDataType({ id: 'not-ref-data-as-pdf', dataType: 'text/plain', taskId: 'Task_1' });
        const dataType2 = generateDataType({ id: 'different-process-task', dataType: 'text/plain', taskId: 'Task_2' });
        state.applicationMetadata.applicationMetadata.dataTypes.push(...[dataType1, dataType2]);
      }
    }),
  });

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
