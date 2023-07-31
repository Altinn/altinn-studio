import React from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormContainerHeaderProps } from './FormContainerHeader';
import { FormContainerHeader } from './FormContainerHeader';
import { renderWithMockStore } from '../testing/mocks';
import { container1IdMock } from '../testing/layoutMock';
import { textMock } from '../../../../testing/mocks/i18nMock';

const user = userEvent.setup();

const handleDeleteMock = jest.fn();

describe('FormContainerHeader', () => {
  afterEach(jest.clearAllMocks);

  it('should render the component', async () => {
    await render();

    expect(screen.getByText(textMock('ux_editor.component_group_header'))).toBeInTheDocument();

    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeInTheDocument();
  });

  it('should delete when clicking the Delete button', async () => {
    await render();

    const button = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(button));

    expect(handleDeleteMock).toHaveBeenCalledTimes(1);
  });
});

const render = async (props: Partial<IFormContainerHeaderProps> = {}) => {
  const allProps: IFormContainerHeaderProps = {
    id: container1IdMock,
    expanded: true,
    isEditMode: false,
    handleExpanded: jest.fn(),
    handleDelete: handleDeleteMock,
    dragHandleRef: null,
    ...props
  };

  return renderWithMockStore()(
    <DndProvider backend={HTML5Backend}>
      <FormContainerHeader {...allProps} />
    </DndProvider>
  );
};
