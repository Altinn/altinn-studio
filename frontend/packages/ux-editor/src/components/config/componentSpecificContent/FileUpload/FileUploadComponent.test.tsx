import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { renderWithMockStore, renderHookWithMockStore } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { FileUploadComponent } from './FileUploadComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormFileUploaderComponent } from '../../../../types/FormComponent';
import { waitFor, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

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
const defaultProps: IGenericEditComponent = {
  component,
  handleComponentChange,
};

describe('FileUploadComponent', () => {
  it('Renders without errors', async () => {
    await render();
  });

  it('render radio button for all fil types', async () => {
    await render();
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForAllFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_all'),
    });
    expect(radioButtonForAllFile).toBeInTheDocument();
  });

  it('render radio button for custom file types', async () => {
    await render();
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForCustomFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_custom'),
    });
    expect(radioButtonForCustomFile).toBeInTheDocument();
  });

  it('render radio button when a simple file is uploaded', async () => {
    await render();
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForSimpleFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_file_upload_simple'),
    });
    expect(radioButtonForSimpleFile).toBeInTheDocument();
  });

  it('render radio button when a list of files is uploaded', async () => {
    await render();
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForList = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_file_upload_list'),
    });
    expect(radioButtonForList).toBeInTheDocument();
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props?: Partial<IGenericEditComponent>) => {
  await waitForData();

  return renderWithMockStore()(<FileUploadComponent {...defaultProps} {...props} />);
};
