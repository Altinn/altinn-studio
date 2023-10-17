import React from 'react';
import { act, screen, within } from '@testing-library/react';
import { renderWithMockStore } from '../../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../../testing/stateMocks';
import { IAppDataState } from '../../../features/appData/appDataReducers';
import { EditDataModelBindings } from './EditDataModelBindings';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import { ComponentType } from 'app-shared/types/ComponentType';
import userEvent from '@testing-library/user-event';

const user = userEvent;

const getDatamodelMetadata = () =>
  Promise.resolve({
    elements: {
      testModel: {
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
      'testModel.field1': {
        id: 'testModel.field1',
        type: 'SimpleType',
        dataBindingName: 'testModel.field1',
        displayString: 'testModel.field1',
        isReadOnly: false,
        isTagContent: false,
        jsonSchemaPointer: '#/definitions/testModel/properteis/field1',
        maxOccurs: 1,
        minOccurs: 1,
        name: 'testModel/field1',
        parentElement: null,
        restrictions: [],
        texts: [],
        xmlSchemaXPath: '/testModel/field1',
        xPath: '/testModel/field1',
      },
    },
  });

const render = async ({
  dataModelBindings = {},
  handleComponentChange = jest.fn(),
  handleDataModelChange = jest.fn(),
  setSelectedOption = jest.fn(),
  onEditClick = jest.fn(),
} = {}) => {
  const appData: IAppDataState = {
    ...appDataMock,
    textResources: {
      ...textResourcesMock,
    },
  };

  renderWithMockStore(
    { appData },
    { getDatamodelMetadata },
    handleDataModelChange(),
    setSelectedOption(),
  )(
    <EditDataModelBindings
      handleComponentChange={handleComponentChange}
      component={{
        id: 'someComponentId',
        type: ComponentType.Input,
        textResourceBindings: {
          title: 'ServiceName',
        },
        dataModelBindings,
        itemType: 'COMPONENT',
      }}
      renderOptions={{
        uniqueKey: 'someComponentId-datamodel-select',
        key: 'simpleBinding',
      }}
    />,
  );
};

describe('EditDataModelBindings', () => {
  it('should show select with no selected option by default', async () => {
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    act(() => {
      linkIcon.click();
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');
  });

  it('should show select with provided data model binding', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(await screen.findByText('testModel.field1')).toBeInTheDocument();
  });

  it('should render link icon', async () => {
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    expect(linkIcon).toBeInTheDocument();
  });

  it('should show select when link icon is clicked', async () => {
    await render();
    const linkIcon = screen.getByText(textMock('ux_editor.modal_properties_data_model_link'));
    act(() => {
      linkIcon.click();
    });
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('should toggle select on link icon click', async () => {
    await render();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('check that handleDataModelChange is called', async () => {
    const handleDataModelChange = jest.fn();
    const dataModelSelectVisible = jest.fn();
    await render({ handleDataModelChange });
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    dataModelSelectVisible(true);
    const select = screen.getByRole('combobox');
    const option = within(select).getByText('');
    act(() => {
      option.click();
    });
    expect(handleDataModelChange).toHaveBeenCalled();
  });

  it('should render save icon', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    expect(saveButton).toBeInTheDocument();
  });

  it('should render delete icon', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('show link data model again when click on save button and no data model binding is selected', async () => {
    await render();
    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox').getAttribute('value')).toEqual('');

    const saveButton = await screen.findByRole('button', { name: /general.save/i });
    act(() => {
      saveButton.click();
    });

    expect(screen.getByText(/ux_editor.modal_properties_data_model_link/i)).toBeInTheDocument();
  });

  it('should call handleDataModelChange and update state on delete button click', async () => {
    const handleDataModelChange = jest.fn();
    let setDataModelSelectVisible = false;
    let setSelectedOption = undefined;

    await render({ handleDataModelChange });

    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });

    expect(await screen.findByText('testModel.field1')).toBeInTheDocument();

    const deleteButton = await screen.findByRole('button', { name: /general.delete/i });
    act(() => {
      deleteButton.click();
    });

    expect(handleDataModelChange).toBeCalled;
    expect((setDataModelSelectVisible = true));
    expect((setSelectedOption = ''));
  });

  it('should call handleDataModelChange and setSelectedOption on data model change', async () => {
    const handleDataModelChange = jest.fn();
    const setSelectedOption = jest.fn();

    await render({ handleDataModelChange, setSelectedOption });

    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });

    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(await screen.findByText('testModel.field1')).toBeInTheDocument();

    expect(handleDataModelChange).toBeCalled;
    expect(setSelectedOption).toBeCalled;
  });

  it('should render LinkedDataModelContainer component when an option is selected', async () => {
    const handleDataModelChange = jest.fn();
    const setSelectedOption = jest.fn();

    await render({ handleDataModelChange, setSelectedOption });

    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });

    expect(
      await screen.findByText(textMock('ux_editor.modal_properties_data_model_helper')),
    ).toBeInTheDocument();
    expect(await screen.findByText('testModel.field1')).toBeInTheDocument();

    expect(handleDataModelChange).toBeCalled;
    expect(setSelectedOption).toBeCalled;

    const linkedDataModelContainer = await screen.findByText('testModel.field1');
    expect(linkedDataModelContainer).toBeInTheDocument();
  });

  it('check that  onEditClick is called', async () => {
    const onEditClick = jest.fn();
    await render({ onEditClick });

    const linkIcon = screen.getByText(/ux_editor.modal_properties_data_model_link/i);
    act(() => {
      linkIcon.click();
    });
    const editIcon = screen.getByRole('button', { name: /Edit/i });
    user.hover(editIcon);
    expect(editIcon).toBeInTheDocument();
    expect(onEditClick).toHaveBeenCalled;
  });
});
