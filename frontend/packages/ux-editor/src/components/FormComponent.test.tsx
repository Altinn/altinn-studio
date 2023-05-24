import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormComponentProps } from './FormComponent';
import { FormComponent } from './FormComponent';
import { queriesMock, renderWithMockStore } from '../testing/mocks';
import { component1IdMock, component1Mock } from '../testing/layoutMock';
import { textMock } from '../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

// Test data:
const handleEditMock = jest.fn();
const handleSaveMock = jest.fn().mockImplementation(() => Promise.resolve());
const handleDiscardMock = jest.fn();

describe('FormComponent', () => {
  afterEach(jest.clearAllMocks);

  describe('when not in edit mode', () => {
    it('should render the component', async () => {
      await render();

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

const render = async (props: Partial<IFormComponentProps> = {}) => {
  const allProps: IFormComponentProps = {
    id: component1IdMock,
    isEditMode: false,
    component: component1Mock,
    handleEdit: handleEditMock,
    handleSave: handleSaveMock,
    handleDiscard: handleDiscardMock,
    ...props
  };

  return renderWithMockStore()(
    <DndProvider backend={HTML5Backend}>
      <FormComponent {...allProps} />
    </DndProvider>
  );
};
