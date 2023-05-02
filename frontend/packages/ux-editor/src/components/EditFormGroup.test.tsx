import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditFormGroup, IEditFormGroupProps } from './EditFormGroup';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { baseContainerIdMock, layoutMock, renderHookWithMockStore, renderWithMockStore } from '../testing/mocks';
import { textMock } from '../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';

const setEditModeMock = jest.fn();

describe('EditFormGroup', () => {
  afterEach(jest.clearAllMocks);

  it('should render the component', async () => {
    await render();

    expect(screen.getByText(textMock('general.cancel'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.save'))).toBeInTheDocument();
  });

  it('should cancel form when clicking the Cancel button', async () => {
    await render();

    const cancelButton = screen.getByText(textMock('general.cancel'))
    expect(cancelButton).toBeInTheDocument();
    await act(() => user.click(cancelButton));

    expect(setEditModeMock).toHaveBeenCalledWith(false);
  });

  it('should save form when clicking the Save button', async () => {
    await render();

    const saveButton = screen.getByText(textMock('general.save'))
    expect(saveButton).toBeInTheDocument();
    await act(() => user.click(saveButton));

    expect(setEditModeMock).toHaveBeenCalledWith(false);
  });
});

const waitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<IEditFormGroupProps> = {}) => {
  const allProps: IEditFormGroupProps = {
    id: baseContainerIdMock,
    layoutOrder: layoutMock.order,
    dataModel: [],
    components: layoutMock.components,
    containers: layoutMock.containers,
    textResources: null,
    dragHandleRef: null,
    setEditMode: setEditModeMock,
    ...props
  };

  await waitForData();

  return renderWithMockStore()(<EditFormGroup {...allProps} />);
};
