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
import { container1IdMock, externalLayoutsMock, layoutMock } from '../../testing/layoutMock';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { FormLayoutsResponse } from 'app-shared/types/api';
import type { ILayoutSettings } from 'app-shared/types/global';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const selectedLayoutSet = 'test-layout-set';

const handleContainerUpdateMock = jest.fn();

describe('EditFormContainer', () => {
  afterEach(jest.clearAllMocks);

  it('should render the component', async () => {
    await render();

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_group_change_id')),
    ).toBeInTheDocument();
  });

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

  test('user should be able to choose which titles to display in table', async () => {
    await render({
      container: {
        ...layoutMock.containers[container1IdMock],
        id: 'test',
        maxCount: 2,
      },
    });

    const repeatingGroupSwitch = screen.getByLabelText(
      textMock('ux_editor.modal_properties_group_repeating'),
    );

    await act(() => user.click(repeatingGroupSwitch));

    expect(
      screen.getByText(textMock('ux_editor.modal_properties_group_table_headers')),
    ).toBeInTheDocument();

    const firstCheckbox = screen.getByRole('checkbox', { name: 'Component-1' });
    await act(() => user.click(firstCheckbox));

    expect(handleContainerUpdateMock).toHaveBeenCalled();
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
    editFormId: container1IdMock,
    container: { ...layoutMock.containers[container1IdMock], id: 'test' },
    handleContainerUpdate: handleContainerUpdateMock,
    ...props,
  };

  await waitForData();

  return renderWithMockStore()(<EditFormContainer {...allProps} />);
};
