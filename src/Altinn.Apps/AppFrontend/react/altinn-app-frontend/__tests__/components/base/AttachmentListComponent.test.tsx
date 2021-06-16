/* eslint-disable no-undef */
/* eslint-disable indent */
// /* tslint:disable:jsx-wrap-multiline */
import 'jest';
import * as React from 'react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import { render, screen } from '@testing-library/react';
import { AttachmentListComponent, IAttachmentListProps } from '../../../src/components/base/AttachmentListComponent';
import { IApplicationMetadata } from '../../../src/shared/resources/applicationMetadata';
import { IInstanceDataState } from '../../../src/shared/resources/instanceData/instanceDataReducers';
import { getInitialStateMock,
  getInstanceDataStateMock,
  applicationMetadataMock } from '../../../__mocks__/mocks';
import { IData } from '../../../../shared/src';

describe('>>> components/base/FileUploadComponent.tsx', () => {
  let mockApplicationMetadata: IApplicationMetadata;
  let mockInstanceData: IInstanceDataState;
  let mockId: string;
  let mockInitialState: any;
  let mockStore: any;

  beforeEach(() => {
    const createStore = configureStore();
    mockId = 'mockId';
    mockApplicationMetadata = applicationMetadataMock;
    const instanceDataMock: IInstanceDataState = getInstanceDataStateMock();
    const dataElement: IData = {
      id: 'test-data-element-1',
      instanceGuid: instanceDataMock.instance.id,
      dataType: 'test-data-type-1',
      filename: 'testData1.pdf',
      contentType: 'application/pdf',
      blobStoragePath: '',
      selfLinks: {
        apps: null,
        platform: null,
      },
      size: 1234,
      locked: false,
      refs: [],
      created: new Date('2021-01-01'),
      createdBy: 'testUser',
      lastChanged: new Date('2021-01-01'),
      lastChangedBy: 'testUser',
    };
    mockInstanceData = {
      ...instanceDataMock,
    };

    mockInstanceData.instance.data = [dataElement];

    mockInitialState = getInitialStateMock({
      applicationMetadata: {
        applicationMetadata: mockApplicationMetadata,
        error: null,
      },
      instanceData: mockInstanceData,
    });

    mockStore = createStore(mockInitialState);
  });

  test('renders default AttachmentList component', () => {
    renderFileUploadComponent();
    expect(screen.getByText('Attachments')).toBeTruthy();
  });

  function renderFileUploadComponent(props: Partial<IAttachmentListProps> = {}) {
    const defaultProps: IAttachmentListProps = {
      id: mockId,
      text: 'Attachments',
      dataTypeIds: ['test-data-type-1'],
    };

    return render(
      <Provider store={mockStore}>
        <AttachmentListComponent {...defaultProps} {...props}/>
      </Provider>,
    );
  }
});
