import React from 'react';

import { screen } from '@testing-library/react';

import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { IData } from 'src/types/shared';

describe('FileUploadComponent', () => {
  it('should render with only specific attachments and without pdf', () => {
    render(['not-ref-data-as-pdf']);
    expect(screen.getByText('2mb.txt')).toBeInTheDocument();
    expect(screen.queryByText('testData1.pdf')).not.toBeInTheDocument();
  });
  it('should render with only pdf attachments', () => {
    render(['ref-data-as-pdf']);
    expect(screen.getByText('testData1.pdf')).toBeInTheDocument();
    expect(screen.queryByText('2mb.txt')).not.toBeInTheDocument();
  });
  it('should render with all attachments', () => {
    render(['include-all']);
    expect(screen.getByText('2mb.txt')).toBeInTheDocument();
    expect(screen.getByText('testData1.pdf')).toBeInTheDocument();
  });
  it('should render with all attachments and without pdf', () => {
    render();
    expect(screen.getByText('2mb.txt')).toBeInTheDocument();
    expect(screen.queryByText('testData1.pdf')).not.toBeInTheDocument();
  });
});

const render = (ids?: string[]) => {
  renderGenericComponentTest({
    type: 'AttachmentList',
    renderer: (props) => <AttachmentListComponent {...props} />,
    component: {
      dataTypeIds: ids,
      textResourceBindings: {
        title: 'Attachments',
      },
    },
    manipulateState: (state) => {
      if (state.instanceData.instance) {
        const dataElement: IData = generateDataElement(
          'test-data-type-1',
          'ref-data-as-pdf',
          'testData1.pdf',
          'application/pdf',
        );
        const dataElement1: IData = generateDataElement(
          'test-data-type-2',
          'not-ref-data-as-pdf',
          '2mb.txt',
          'text/plain',
        );
        state.instanceData.instance.data = [dataElement, dataElement1];
      }
      if (state.applicationMetadata.applicationMetadata) {
        const dataType1 = generateDataType('ref-data-as-pdf', 'application/pdf');
        const dataType2 = generateDataType('not-ref-data-as-pdf', 'text/plain');
        state.applicationMetadata.applicationMetadata.dataTypes = [dataType1, dataType2];
      }
    },
  });
};

const generateDataElement = (id: string, dataType: string, filename: string, contentType: string) => ({
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

const generateDataType = (id: string, dataType: string) => ({
  id,
  taskId: 'mockElementId',
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
