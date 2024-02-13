import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IEditFormContainerProps } from './EditFormContainer';
import { EditFormContainer } from './EditFormContainer';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../testing/mocks';
import { useLayoutSchemaQuery } from '../../hooks/queries/useLayoutSchemaQuery';
import {
  component2IdMock,
  container2IdMock,
  externalLayoutsMock,
  layoutMock,
} from '../../testing/layoutMock';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { FormLayoutsResponse } from 'app-shared/types/api';
import type { ILayoutSettings } from 'app-shared/types/global';
import { ComponentType } from 'app-shared/types/ComponentType';
import { componentMocks } from '../../testing/componentMocks';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

const nonRepeatingGroupContainers = [
  componentMocks[ComponentType.Accordion],
  componentMocks[ComponentType.AccordionGroup],
  componentMocks[ComponentType.ButtonGroup],
  componentMocks[ComponentType.Group],
];

const handleContainerUpdateMock = jest.fn();

jest.mock('./FormComponentConfig', () => ({
  FormComponentConfig: () => <div data-testid='formComponentConfig' />,
}));

describe('EditFormContainer', () => {
  afterEach(jest.clearAllMocks);

  it('should render the component', async () => {
    await render();

    // Act is needed to avoid error with LegacySelect used in FormField
    await act(() => Promise.resolve());

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_group_change_id')),
    ).toBeInTheDocument();
  });

  it.each(nonRepeatingGroupContainers)(
    'should only show component config generated from schema message when container is not repeating group',
    async (container) => {
      await render({ container });
      expect(
        screen.queryByText(textMock('ux_editor.modal_properties_group_table_headers')),
      ).not.toBeInTheDocument();
      expect(screen.getByTestId('formComponentConfig')).toBeInTheDocument();
    },
  );

  it('should update form when editing field', async () => {
    await render();

    const containerIdInput = screen.getByLabelText(
      textMock('ux_editor.modal_properties_group_change_id'),
    );
    await act(() => user.type(containerIdInput, 'test'));
    expect(handleContainerUpdateMock).toHaveBeenCalledTimes(4);
  });

  it('should display an error when containerId is invalid', async () => {
    await render();

    const containerIdInput = screen.getByLabelText(
      textMock('ux_editor.modal_properties_group_change_id'),
    );
    await act(() => user.type(containerIdInput, 'test@'));
    expect(
      screen.getByText(textMock('ux_editor.modal_properties_group_id_not_valid')),
    ).toBeInTheDocument();
    expect(handleContainerUpdateMock).toHaveBeenCalledTimes(4);
  });

  it('user should be able to choose which titles to display in table', async () => {
    await render();

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_group_table_headers')),
    ).toBeInTheDocument();

    const firstCheckbox = screen.getByRole('checkbox', { name: component2IdMock });
    expect(firstCheckbox).toBeInTheDocument();
    await act(() => user.click(firstCheckbox));

    expect(handleContainerUpdateMock).toHaveBeenCalled();
  });

  it('should call handleContainerUpdate with data model binding when changed', async () => {
    const dataBindingNameMock = 'element';
    const maxCountMock = 2;
    queryClientMock.setQueryData(
      [QueryKey.DatamodelMetadata, org, app],
      [{ dataBindingName: dataBindingNameMock, maxOccurs: maxCountMock }],
    );
    await render();

    const dataModelSelect = screen.getByRole('combobox', {
      name: textMock('ux_editor.modal_properties_data_model_helper'),
    });
    expect(dataModelSelect).toBeInTheDocument();
    await act(() => user.click(dataModelSelect));
    const dataModelOption = screen.getByRole('option', { name: dataBindingNameMock });
    await act(() => user.click(dataModelOption));

    expect(handleContainerUpdateMock).toHaveBeenCalled();
    expect(handleContainerUpdateMock).toHaveBeenCalledWith({
      ...layoutMock.containers[container2IdMock],
      maxCount: maxCountMock,
      dataModelBindings: { group: dataBindingNameMock },
    });
  });

  it('handleContainerUpdate is called with "tableHeaders: undefined" when #headers equals #items', async () => {
    await render();

    const firstCheckbox = screen.getByRole('checkbox', { name: component2IdMock });
    // Needs two clicks to trigger the code
    await act(() => user.click(firstCheckbox));
    await act(() => user.click(firstCheckbox));

    expect(handleContainerUpdateMock).toHaveBeenCalledTimes(2);
    expect(handleContainerUpdateMock).toHaveBeenLastCalledWith({
      ...layoutMock.containers[container2IdMock],
      tableHeaders: undefined,
    });
  });
});

const waitForData = async () => {
  const getFormLayouts = jest
    .fn()
    .mockImplementation(() => Promise.resolve<FormLayoutsResponse>(externalLayoutsMock));
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve<ILayoutSettings>(formLayoutSettingsMock));
  const formLayoutsResult = renderHookWithMockStore(
    {},
    { getFormLayouts },
  )(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props: Partial<IEditFormContainerProps> = {}) => {
  const allProps: IEditFormContainerProps = {
    editFormId: container2IdMock,
    container: { ...layoutMock.containers[container2IdMock] },
    handleContainerUpdate: handleContainerUpdateMock,
    ...props,
  };

  await waitForData();

  return renderWithMockStore()(<EditFormContainer {...allProps} />);
};
