import React from 'react';

import { screen } from '@testing-library/react';

import { AttachmentListComponent } from 'src/layout/AttachmentList/AttachmentListComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { IData } from 'src/types/shared';

describe('FileUploadComponent', () => {
  it('should render default AttachmentList component', () => {
    render();
    expect(screen.getByText('Attachments')).toBeInTheDocument();
  });
});

const render = () => {
  renderGenericComponentTest({
    type: 'AttachmentList',
    renderer: (props) => <AttachmentListComponent {...props} />,
    component: {
      dataTypeIds: ['test-data-type-1'],
    },
    genericProps: {
      text: 'Attachments',
    },
    manipulateState: (state) => {
      if (state.instanceData.instance) {
        const dataElement: IData = {
          id: 'test-data-element-1',
          instanceGuid: state.instanceData.instance.id,
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
        state.instanceData.instance.data = [dataElement];
      }
    },
  });
};
