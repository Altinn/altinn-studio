import React from 'react';
import { Content } from './Content';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FormItemContext } from '../../containers/FormItemContext';
import {
  component1IdMock,
  component1Mock,
  container1IdMock,
  layoutMock,
} from '../../testing/layoutMock';
import type { IAppDataState } from '../../features/appData/appDataReducers';
import type { ITextResourcesState } from '../../features/appData/textResources/textResourcesSlice';
import { renderWithMockStore, renderHookWithMockStore } from '../../testing/mocks';
import { appDataMock, textResourcesMock } from '../../testing/stateMocks';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';

const user = userEvent.setup();

// Test data:
const textResourceEditTestId = 'text-resource-edit';

// Mocks:
jest.mock('../TextResourceEdit', () => ({
  TextResourceEdit: () => <div data-testid={textResourceEditTestId} />,
}));

describe('ContentTab', () => {
  afterEach(jest.clearAllMocks);

  describe('when editing a text resource', () => {
    it('should render the component', async () => {
      await render({ props: {}, editId: 'test' });
      expect(screen.getByTestId(textResourceEditTestId)).toBeInTheDocument();
    });
  });

  describe('when editing a container', () => {
    const props = {
      formItemId: container1IdMock,
      formItem: { ...layoutMock.containers[container1IdMock], id: 'id' },
    };

    it('should render the component', async () => {
      await render({ props });
      expect(
        screen.getByText(textMock('ux_editor.modal_properties_group_change_id')),
      ).toBeInTheDocument();
    });

    it('should auto-save when updating a field', async () => {
      await render({ props });

      const idInput = screen.getByLabelText(textMock('ux_editor.modal_properties_group_change_id'));
      await user.type(idInput, 'test');

      expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(4);
      expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(4);
    });
  });

  describe('when editing a component', () => {
    const props = {
      formItemId: component1IdMock,
      formItem: { ...component1Mock, dataModelBindings: {} },
    };

    it('should render the component', async () => {
      jest.spyOn(console, 'error').mockImplementation(); // Silence error from Select component
      await render({ props });
      expect(
        screen.getByText(textMock('ux_editor.modal_properties_component_change_id')),
      ).toBeInTheDocument();
    });

    it('should auto-save when updating a field', async () => {
      await render({ props });

      const idInput = screen.getByLabelText(
        textMock('ux_editor.modal_properties_component_change_id'),
      );
      await user.type(idInput, 'test');

      expect(formItemContextProviderMock.handleUpdate).toHaveBeenCalledTimes(4);
      expect(formItemContextProviderMock.debounceSave).toHaveBeenCalledTimes(4);
    });
  });
});

const waitForData = async () => {
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async ({
  props = {},
  editId,
}: {
  props: Partial<FormItemContext>;
  editId?: string;
}) => {
  const textResources: ITextResourcesState = {
    ...textResourcesMock,
    currentEditId: editId,
  };
  const appData: IAppDataState = {
    ...appDataMock,
    textResources,
  };

  await waitForData();

  return renderWithMockStore({ appData })(
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
        ...props,
      }}
    >
      <Content />
    </FormItemContext.Provider>,
  );
};
