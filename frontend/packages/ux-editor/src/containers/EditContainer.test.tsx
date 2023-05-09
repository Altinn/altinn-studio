import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditContainer, IEditContainerProps } from './EditContainer';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { queriesMock, renderHookWithMockStore, renderWithMockStore } from '../testing/mocks';
import { baseContainerIdMock, layoutMock } from '../testing/layoutMock';
import { textMock } from '../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';

const cancelEditModeMock = jest.fn();

describe('EditContainer', () => {
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

    expect(cancelEditModeMock).toHaveBeenCalledTimes(1);
  });

  it('should save form when clicking the Save button', async () => {
    await render();

    const saveButton = screen.getByText(textMock('general.save'))
    expect(saveButton).toBeInTheDocument();
    await act(() => user.click(saveButton));

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    expect(cancelEditModeMock).toHaveBeenCalledTimes(1);
  });
});

const waitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<IEditContainerProps> = {}) => {
  const allProps: IEditContainerProps = {
    id: baseContainerIdMock,
    layoutOrder: layoutMock.order,
    dragHandleRef: null,
    cancelEditMode: cancelEditModeMock,
    ...props
  };

  await waitForData();

  return renderWithMockStore()(<EditContainer {...allProps} />);
};
