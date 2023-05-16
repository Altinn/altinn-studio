import React from 'react';
import { screen } from '@testing-library/react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormContainerProps } from './FormContainer';
import { FormContainer } from './FormContainer';
import { renderWithMockStore } from '../testing/mocks';
import { container1IdMock, layoutMock } from '../testing/layoutMock';
import { createMockedDndEvents } from './helpers/dnd-helpers.test';
import { textMock } from '../../../../testing/mocks/i18nMock';

const handleDiscardMock = jest.fn();
const handleEditMock = jest.fn();
const handleSaveMock = jest.fn().mockImplementation(() => Promise.resolve());

describe('FormContainer', () => {
  afterEach(jest.clearAllMocks);

  it('should render the empty placeholder when no children', async () => {
    await render();

    expect(screen.getByText(textMock('ux_editor.container_empty'))).toBeInTheDocument();
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
