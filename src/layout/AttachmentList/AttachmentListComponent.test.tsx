import React from 'react';

import { screen } from '@testing-library/react';

import { applicationMetadataMock } from 'src/__mocks__/applicationMetadataMock';
import { getInitialStateMock } from 'src/__mocks__/initialStateMock';
import { getInstanceDataStateMock } from 'src/__mocks__/instanceDataStateMock';
import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { renderWithProviders } from 'src/testUtils';
import type { IAttachmentListProps } from 'src/layout/AttachmentList/AttachmentListComponent';
import type { IInstanceDataState } from 'src/shared/resources/instanceData';
import type { IData } from 'src/types/shared';

describe('FileUploadComponent', () => {
  it('should render default AttachmentList component', () => {
    render({ text: 'Attachments' });
    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });
});

function render(props: Partial<IAttachmentListProps> = {}) {
  const mockId = 'mockId';

  const mockApplicationMetadata = applicationMetadataMock;
  const instanceDataMock: IInstanceDataState = getInstanceDataStateMock();
  if (!instanceDataMock.instance) {
    throw new Error('Missing data in mock');
  }

  const dataElement: IData = {
    id: 'test-data-element-1',
    instanceGuid: instanceDataMock.instance.id,
    dataType: 'test-data-type-1',
    filename: 'testData1.pdf',
    contentType: 'application/pdf',
    blobStoragePath: '',
    size: 1234,
    locked: false,
    refs: [],
    created: new Date('2021-01-01').toISOString(),
    createdBy: 'testUser',
    lastChanged: new Date('2021-01-01').toISOString(),
    lastChangedBy: 'testUser',
  };
  const mockInstanceData = {
    ...instanceDataMock,
  };

  if (mockInstanceData.instance) {
    mockInstanceData.instance.data = [dataElement];
  }

  const mockInitialState = getInitialStateMock({
    applicationMetadata: {
      applicationMetadata: mockApplicationMetadata,
      error: null,
    },
    instanceData: mockInstanceData,
  });

  const defaultProps = {
    id: mockId,
    text: 'Attachments',
    dataTypeIds: ['test-data-type-1'],
  } as IAttachmentListProps;

  return renderWithProviders(
    <AttachmentListComponent
      {...defaultProps}
      {...props}
    />,
    {
      preloadedState: mockInitialState,
    },
  );
}
