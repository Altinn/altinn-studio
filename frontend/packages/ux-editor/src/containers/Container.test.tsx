import React from 'react';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Container, IContainerProps } from './Container';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutSettingsQuery } from '../hooks/queries/useFormLayoutSettingsQuery';
import { queriesMock, renderHookWithMockStore, renderWithMockStore } from '../testing/mocks';
import { container1IdMock, baseContainerIdMock, layoutMock } from '../testing/layoutMock';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createMockedDndEvents } from './helpers/dnd-helpers.test';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { DndProvider } from 'react-dnd';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';

describe('Container', () => {
  afterEach(jest.clearAllMocks);

  it('should render the component', async () => {
    await render();

    expect(screen.getByText('Gruppe - $' + container1IdMock)).toBeInTheDocument();
    expect(screen.getByText(textMock('ux_editor.component_input'))).toBeInTheDocument();
    expect(screen.getByText(textMock('ux_editor.component_paragraph'))).toBeInTheDocument();

    const formGroup = screen.getByTestId('form-group');

    expect(within(formGroup).getByText(textMock('general.delete'))).toBeInTheDocument();
    expect(within(formGroup).getByText(textMock('general.edit'))).toBeInTheDocument();
  });

  it('should be in edit mode when clicking the Edit button', async () => {
    await render();

    const formGroup = screen.getByTestId('form-group');

    const editButton = within(formGroup).getByText(textMock('general.edit'));
    await act(() => user.click(editButton));

    expect(screen.getByText(textMock('general.cancel'))).toBeInTheDocument();
    expect(screen.getByText(textMock('general.save'))).toBeInTheDocument();
  });

  it('should delete container when clicking the Delete button', async () => {
    await render();

    const formGroup = screen.getByTestId('form-group');

    const deleteButton = within(formGroup).getByText(textMock('general.delete'));
    await act(() => user.click(deleteButton));

    expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
  });
});

const waitForData = async () => {
  const formLayoutsResult = renderHookWithMockStore()(() => useFormLayoutsQuery(org, app)).renderHookResult.result;
  const settingsResult = renderHookWithMockStore()(() => useFormLayoutSettingsQuery(org, app)).renderHookResult.result;
  await waitFor(() => expect(formLayoutsResult.current.isSuccess).toBe(true));
  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<IContainerProps> = {}) => {
  const allProps: IContainerProps = {
    isBaseContainer: true,
    canDrag: false,
    id: baseContainerIdMock,
    layoutOrder: layoutMock.order,
    dndEvents: createMockedDndEvents(),
    ...props
  };

  await waitForData();

  return renderWithMockStore()(<DndProvider backend={HTML5Backend}><Container {...allProps} /></DndProvider>);
};
