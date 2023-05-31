import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IEditFormContainerProps } from './EditFormContainer';
import { EditFormContainer } from './EditFormContainer';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { renderHookWithMockStore, renderWithMockStore } from '../../testing/mocks';
import { container1IdMock, layoutMock } from '../../testing/layoutMock';
import { textMock } from '../../../../../testing/mocks/i18nMock';

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

    expect(screen.getByText(textMock('ux_editor.modal_properties_group_change_id') + ' *')).toBeInTheDocument();
  });

  it('should update form when editing field', async () => {
    await render();

    const containerIdInput = screen.getByLabelText(textMock('ux_editor.modal_properties_group_change_id') + ' *');
    await act(() => user.type(containerIdInput, "new-test"));
    await act(() => user.click(document.body));
    expect(handleContainerUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('should display an error when containerId is invalid', async () => {
    await render();

    const containerIdInput = screen.getByLabelText(textMock('ux_editor.modal_properties_group_change_id') + ' *');
    await act(() => user.type(containerIdInput, "new test"));
    await act(() => user.click(document.body));
    expect(screen.getByText(textMock('ux_editor.modal_properties_group_id_not_valid'))).toBeInTheDocument();
    expect(handleContainerUpdateMock).toHaveBeenCalledTimes(0);
  });
});

const waitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsQuery(org, app, selectedLayoutSet)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<IEditFormContainerProps> = {}) => {
  const allProps: IEditFormContainerProps = {
    editFormId: container1IdMock,
    container: { ...layoutMock.containers[container1IdMock], id: 'test' },
    handleContainerUpdate: handleContainerUpdateMock,
    ...props
  };

  await waitForData();

  return renderWithMockStore()(<EditFormContainer {...allProps} />);
};
