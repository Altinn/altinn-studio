import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormContainerProps } from './FormContainer';
import { FormContainer } from './FormContainer';
import { queriesMock, renderWithMockStore } from '../testing/mocks';
import { container1IdMock, layoutMock } from '../testing/layoutMock';
import { createMockedDndEvents } from './helpers/dnd-helpers.test';
import { textMock } from '../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

const handleDiscardMock = jest.fn();
const handleEditMock = jest.fn();
const handleSaveMock = jest.fn().mockImplementation(() => Promise.resolve());

describe('FormContainer', () => {
  afterEach(jest.clearAllMocks);

  describe('when not in edit mode', () => {
    it('should render the component', async () => {
      await render();

      expect(screen.getByText('Gruppe - $' + container1IdMock)).toBeInTheDocument();
      expect(screen.getByText(textMock('ux_editor.container_empty'))).toBeInTheDocument();

      expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: textMock('general.edit') })).toBeInTheDocument();
    });

    it('should edit when clicking the Edit button', async () => {
      await render();

      const button = screen.getByRole('button', { name: textMock('general.edit') });
      await act(() => user.click(button));

      expect(handleEditMock).toHaveBeenCalledTimes(1);
    });

    it('should delete when clicking the Delete button', async () => {
      await render();

      const button = screen.getByRole('button', { name: textMock('general.delete') });
      await act(() => user.click(button));

      expect(queriesMock.saveFormLayout).toHaveBeenCalledTimes(1);
    });
  });

  describe('when in edit mode', () => {
    it('should render the component', async () => {
      await render({ isEditMode: true });

      expect(screen.getByText('Gruppe - $' + container1IdMock)).toBeInTheDocument();
      expect(screen.getByText(textMock('ux_editor.container_empty'))).toBeInTheDocument();

      expect(screen.getByRole('button', { name: textMock('general.cancel') })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: textMock('general.save') })).toBeInTheDocument();
    });

    it('should save when clicking the Save button', async () => {
      await render({ isEditMode: true });

      const button = screen.getByRole('button', { name: textMock('general.save') });
      await act(() => user.click(button));

      expect(handleSaveMock).toHaveBeenCalledTimes(1);
    });

    it('should discard when clicking the Discard button', async () => {
      await render({ isEditMode: true });

      const button = screen.getByRole('button', { name: textMock('general.cancel') });
      await act(() => user.click(button));

      expect(handleDiscardMock).toHaveBeenCalledTimes(1);
    });
  });
});

const render = async (props: Partial<IFormContainerProps> = {}) => {
  const allProps: IFormContainerProps = {
    isBaseContainer: false,
    canDrag: true,
    id: container1IdMock,
    dndEvents: createMockedDndEvents(),
    container: layoutMock.containers[container1IdMock],
    handleEdit: handleEditMock,
    handleSave: handleSaveMock,
    handleDiscard: handleDiscardMock,
    children: [],
    isEditMode: false,
    ...props
  };

  return renderWithMockStore()(
    <DndProvider backend={HTML5Backend}>
      <FormContainer {...allProps} />
    </DndProvider>
  );
};
