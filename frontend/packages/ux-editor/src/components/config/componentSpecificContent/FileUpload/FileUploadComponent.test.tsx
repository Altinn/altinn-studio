import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { renderWithMockStore, renderHookWithMockStore } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { FileUploadComponent, FileUploadComponentProps } from './FileUploadComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormFileUploaderComponent } from '../../../../types/FormComponent';
import { waitFor } from '@testing-library/react';

// Test data:
const component: FormFileUploaderComponent = {
  description: 'Lorem ipsum dolor sit amet',
  displayMode: 'test',
  hasCustomFileEndings: false,
  id: '1',
  maxFileSizeInMB: 10,
  maxNumberOfAttachments: 1,
  minNumberOfAttachments: 0,
  onClickAction: jest.fn(),
  type: ComponentType.FileUpload,
  itemType: 'COMPONENT',
  dataModelBindings: {},
};
const handleComponentChange = jest.fn();
const defaultProps: FileUploadComponentProps = {
  component,
  handleComponentChange,
  isProd: true,
};

describe('FileUploadComponent', () => {
  it('Renders without errors', async () => {
    await render();
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props?: Partial<FileUploadComponentProps>) => {
  await waitForData();

  return renderWithMockStore()(<FileUploadComponent {...defaultProps} {...props} />);
};
