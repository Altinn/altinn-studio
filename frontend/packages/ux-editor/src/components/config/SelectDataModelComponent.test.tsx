import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../testing/mocks';
import { SelectDataModelComponent } from './SelectDataModelComponent';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { ComponentType } from 'app-shared/types/ComponentType';
import { getDataModelFieldsFilter } from '../../utils/datamodel';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const datamodelMetadataMock = [
  {
    id: 'testModel',
    type: 'ComplexType',
    dataBindingName: 'testModel',
    displayString: 'testModel',
    isReadOnly: false,
    isTagContent: false,
    jsonSchemaPointer: '#/definitions/testModel',
    maxOccurs: 1,
    minOccurs: 1,
    name: 'testModel',
    parentElement: null,
    restrictions: [],
    texts: [],
    xmlSchemaXPath: '/testModel',
    xPath: '/testModel',
  },
  {
    id: 'testModel.field1',
    type: 'SimpleType',
    dataBindingName: 'testModel.field1',
    displayString: 'testModel.field1',
    isReadOnly: false,
    isTagContent: false,
    jsonSchemaPointer: '#/definitions/testModel/properties/field1',
    maxOccurs: 1,
    minOccurs: 1,
    name: 'testModel/field1',
    parentElement: null,
    restrictions: [],
    texts: [],
    xmlSchemaXPath: '/testModel/field1',
    xPath: '/testModel/field1',
  },
  {
    dataBindingName: 'multipleAnswers',
    maxOccurs: 10,
    name: 'multipleAnswers',
    xsdValueType: 'String',
  },
  {
    dataBindingName: 'repGroupField',
    maxOccurs: 10,
    minOccurs: 1,
    name: 'repGroupField',
  },
];

const user = userEvent.setup();

const render = async ({
  dataModelMetadata = datamodelMetadataMock,
  componentType = ComponentType.Input,
  label = undefined,
  handleComponentChange = jest.fn(),
} = {}) => {
  queryClientMock.setQueryData([QueryKey.DatamodelMetadata, 'org', 'app'], dataModelMetadata);

  renderWithProviders(
    <SelectDataModelComponent
      label={textMock(`ux_editor.component_title.${componentType}`)}
      onDataModelChange={handleComponentChange}
      dataModelFieldsFilter={getDataModelFieldsFilter(componentType, label)}
      selectedElement={undefined}
    />,
  );
};

describe('SelectDataModelComponent', () => {
  it('should show select with no selected option by default', async () => {
    await render();
    expect(
      screen.getByText(textMock(`ux_editor.component_title.${ComponentType.Input}`)),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');
  });

  it('renders when dataModelData is undefined', async () => {
    await render({ dataModelMetadata: undefined });
    const bindingTitle = screen.getByText(
      textMock(`ux_editor.component_title.${ComponentType.Input}`),
    );
    expect(bindingTitle).toBeInTheDocument();
  });

  it('should show select with provided value', async () => {
    await render();
    const select = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_title.${ComponentType.Input}`),
    });
    await act(() => user.click(select));
    expect(screen.getByText('testModel.field1')).toBeInTheDocument();
  });

  it('should call onChange when a new option is selected', async () => {
    const handleComponentChange = jest.fn();
    await render({
      handleComponentChange,
    });
    const selectElement = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_title.${ComponentType.Input}`),
    });
    await act(() => user.click(selectElement));
    const optionElement = screen.getByText('testModel.field1');
    await act(() => user.click(optionElement));
    await waitFor(() => {});
    expect(handleComponentChange).toHaveBeenCalledWith('testModel.field1');
  });

  it('should render repGroupField and multipleAnswers fields for RepeatingGroup component', async () => {
    await render({
      componentType: ComponentType.RepeatingGroup,
    });
    const selectElement = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_title.${ComponentType.RepeatingGroup}`),
    });
    await act(() => user.click(selectElement));
    const optionElement1 = screen.queryByText('testModel.field1');
    const optionElement2 = screen.getByText('multipleAnswers');
    const optionElement3 = screen.getByText('repGroupField');
    expect(optionElement1).not.toBeInTheDocument();
    expect(optionElement2).toBeInTheDocument();
    expect(optionElement3).toBeInTheDocument();
  });

  it('should render only multipleAnswers field for FileUpload component with multiple attachments enabled', async () => {
    await render({
      componentType: ComponentType.FileUpload,
      label: 'list',
    });
    const selectElement = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_title.${ComponentType.FileUpload}`),
    });
    await act(() => user.click(selectElement));
    const optionElement1 = screen.queryByText('testModel.field1');
    const optionElement2 = screen.getByText('multipleAnswers');
    const optionElement3 = screen.queryByText('repGroupField');
    expect(optionElement1).not.toBeInTheDocument();
    expect(optionElement2).toBeInTheDocument();
    expect(optionElement3).not.toBeInTheDocument();
  });

  it('should render only multipleAnswers field for FileUploadWithTag component with multiple attachments enabled', async () => {
    await render({
      componentType: ComponentType.FileUploadWithTag,
      label: 'list',
    });
    const selectElement = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_title.${ComponentType.FileUploadWithTag}`),
    });
    await act(() => user.click(selectElement));
    const optionElement1 = screen.queryByText('testModel.field1');
    const optionElement2 = screen.getByText('multipleAnswers');
    const optionElement3 = screen.queryByText('repGroupField');
    expect(optionElement1).not.toBeInTheDocument();
    expect(optionElement2).toBeInTheDocument();
    expect(optionElement3).not.toBeInTheDocument();
  });

  it('should render only simple fields for FileUpload component without multiple attachments enabled', async () => {
    await render({
      componentType: ComponentType.FileUpload,
    });
    const selectElement = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_title.${ComponentType.FileUpload}`),
    });
    await act(() => user.click(selectElement));
    const optionElement1 = screen.getByText('testModel.field1');
    const optionElement2 = screen.queryByText('multipleAnswers');
    const optionElement3 = screen.queryByText('repGroupField');
    expect(optionElement1).toBeInTheDocument();
    expect(optionElement2).not.toBeInTheDocument();
    expect(optionElement3).not.toBeInTheDocument();
  });

  it('should render only simple fields for FileUploadWithTag component without multiple attachments enabled', async () => {
    await render({
      componentType: ComponentType.FileUploadWithTag,
    });
    const selectElement = screen.getByRole('combobox', {
      name: textMock(`ux_editor.component_title.${ComponentType.FileUploadWithTag}`),
    });
    await act(() => user.click(selectElement));
    const optionElement1 = screen.getByText('testModel.field1');
    const optionElement2 = screen.queryByText('multipleAnswers');
    const optionElement3 = screen.queryByText('repGroupField');
    expect(optionElement1).toBeInTheDocument();
    expect(optionElement2).not.toBeInTheDocument();
    expect(optionElement3).not.toBeInTheDocument();
  });
});
