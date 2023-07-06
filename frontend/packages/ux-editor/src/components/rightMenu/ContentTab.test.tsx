import React from 'react';
import { ContentTab } from './ContentTab';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { FormContext } from '../../containers/FormContext';
import { component1IdMock, component1Mock, container1IdMock, layoutMock } from '../../testing/layoutMock';
import type { IAppDataState } from '../../features/appData/appDataReducers';
import type { ITextResourcesState } from '../../features/appData/textResources/textResourcesSlice';
import {
  appDataMock,
  renderWithMockStore,
  textResourcesMock,
} from '../../testing/mocks';

const user = userEvent.setup();

// Test data:
const textResourceEditTestId = 'text-resource-edit';

const FormContextProviderMock = {
  formId: null,
  form: null,
  handleDiscard: jest.fn(),
  handleEdit: jest.fn(),
  handleUpdate: jest.fn(),
  handleContainerSave: jest.fn().mockImplementation(() => Promise.resolve()),
  handleComponentSave: jest.fn().mockImplementation(() => Promise.resolve()),
}

// Mocks:
jest.mock('../TextResourceEdit', () => ({
  TextResourceEdit: () => <div data-testid={textResourceEditTestId} />
}));

describe('ContentTab', () => {
  afterEach(jest.clearAllMocks);

  describe('when editing a text resource', () => {
    it('should render the component', async () => {
      await render(null, textResourceEditTestId);

      expect(screen.getByTestId(textResourceEditTestId)).toBeInTheDocument();
    });
  });

  describe('when editing a container', () => {
    const props = {
      formId: container1IdMock,
      form: { ... layoutMock.containers[container1IdMock], id: 'id' }
    };

    it('should render the component', async () => {
      await render(props);

      expect(screen.getByText(textMock('ux_editor.modal_properties_group_change_id') + ' *')).toBeInTheDocument();
    });

    it('should auto-save when updating a field', async () => {
      await render(props);

      const idInput = screen.getByLabelText(textMock('ux_editor.modal_properties_group_change_id') + ' *');
      await act(() => user.type(idInput, "test"));

      expect(FormContextProviderMock.handleUpdate).toHaveBeenCalledTimes(4);
      expect(FormContextProviderMock.handleContainerSave).toHaveBeenCalledTimes(4);
    });
  });

  describe('when editing a component', () => {
    const props = {
      formId: component1IdMock,
      form: { ...component1Mock, dataModelBindings: {} }
    };

    it('should render the component', async () => {
      await render(props);

      expect(screen.getByText(textMock('ux_editor.modal_properties_component_change_id') + ' *')).toBeInTheDocument();
    });

    it('should auto-save when updating a field', async () => {
      await render(props);

      const idInput = screen.getByLabelText(textMock('ux_editor.modal_properties_component_change_id') + ' *');
      await act(() => user.type(idInput, "test"));

      expect(FormContextProviderMock.handleUpdate).toHaveBeenCalledTimes(4);
      expect(FormContextProviderMock.handleComponentSave).toHaveBeenCalledTimes(4);
    });
  });
});

const render = async (props: Partial<FormContext> = {}, editId?: string) => {
  const textResources: ITextResourcesState = {
    ...textResourcesMock,
    currentEditId: editId,
  };
  const appData: IAppDataState = {
    ...appDataMock,
    textResources
  };

  return renderWithMockStore({ appData })(
    <FormContext.Provider value={{
      ...FormContextProviderMock,
      ...props
    }}>
      <ContentTab />
    </FormContext.Provider>
  );
};
