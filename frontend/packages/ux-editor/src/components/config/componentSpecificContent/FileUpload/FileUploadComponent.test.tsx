import React from 'react';
import { IGenericEditComponent } from '../../componentConfig';
import { renderWithMockStore, renderHookWithMockStore } from '../../../../testing/mocks';
import { useLayoutSchemaQuery } from '../../../../hooks/queries/useLayoutSchemaQuery';
import { FileUploadComponent } from './FileUploadComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { FormFileUploaderComponent } from '../../../../types/FormComponent';
import { waitFor, screen, act } from '@testing-library/react';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

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

  it("render radio button for all fil types when 'hasCustomFileEndings' is true", async () => {
    await render({ component: { ...component, hasCustomFileEndings: true } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForAllFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_all'),
    });
    expect(radioButtonForAllFile).toBeInTheDocument();
  });

  it("render radio button for all fil types when 'hasCustomFileEndings' is false", async () => {
    await render({ component: { ...component, hasCustomFileEndings: false } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForAllFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_all'),
    });
    expect(radioButtonForAllFile).toBeInTheDocument();
  });

  it("render radio button for custom file types when 'hasCustomFileEndings' is true", async () => {
    await render({ component: { ...component, hasCustomFileEndings: true } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForCustomFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_custom'),
    });
    expect(radioButtonForCustomFile).toBeInTheDocument();
  });

  it("render radio button for custom file types when 'hasCustomFileEndings' is false", async () => {
    await render({ component: { ...component, hasCustomFileEndings: false } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForCustomFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_custom'),
    });
    expect(radioButtonForCustomFile).toBeInTheDocument();
  });

  it("render radio button for a simple file and 'displayMode' is 'simple' ", async () => {
    await render({ component: { ...component, displayMode: 'simple' } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForSimpleFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_file_upload_simple'),
    });
    expect(radioButtonForSimpleFile).toBeInTheDocument();
  });

  it("render radio button for list of files and 'displayMode' is 'list' ", async () => {
    await render({ component: { ...component, displayMode: 'list' } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForSimpleFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_file_upload_list'),
    });
    expect(radioButtonForSimpleFile).toBeInTheDocument();
  });

  it("Verify that when select the radio button ('Custom File Types'), the other radio button 'All File Types' is deselected", async () => {
    await render({ component: { ...component, hasCustomFileEndings: true } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForAllFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_all'),
    });
    const radioButtonForCustomFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_custom'),
    });
    expect(radioButtonForAllFile).toBeInTheDocument();
    expect(radioButtonForCustomFile).toBeInTheDocument();
    expect(radioButtonForAllFile).not.toBeChecked();
    expect(radioButtonForCustomFile).toBeChecked();
  });

  it("Verify that when select the radio button ('All File Types'), the other radio button 'Custom File Types' is deselected", async () => {
    await render({ component: { ...component, hasCustomFileEndings: false } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForAllFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_all'),
    });
    const radioButtonForCustomFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_custom'),
    });
    expect(radioButtonForAllFile).toBeInTheDocument();
    expect(radioButtonForCustomFile).toBeInTheDocument();
    expect(radioButtonForAllFile).toBeChecked();
    expect(radioButtonForCustomFile).not.toBeChecked();
  });

  it('Ensure that the onChange function is called when a radio button is clicked', async () => {
    const user = userEvent.setup();
    await render({ component: { ...component, hasCustomFileEndings: false } });
    <FileUploadComponent {...defaultProps} />;
    const radioButtonForCustomFile = screen.getByRole('radio', {
      name: textMock('ux_editor.modal_properties_valid_file_endings_custom'),
    });
    expect(radioButtonForCustomFile).not.toBeChecked();

    await act(async () => {
      await user.click(radioButtonForCustomFile);
    });

    expect(handleComponentChange).toHaveBeenCalledWith({
      ...component,
      hasCustomFileEndings: true,
    });
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
