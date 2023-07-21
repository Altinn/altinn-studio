import React from 'react';
import { act, screen } from '@testing-library/react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormContainerProps } from './FormContainer';
import { FormContainer } from './FormContainer';
import { renderWithMockStore } from '../testing/mocks';
import { container1IdMock, layoutMock } from '../testing/layoutMock';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../testing/mocks/i18nMock';

const handleDiscardMock = jest.fn();
const handleEditMock = jest.fn().mockImplementation(() => Promise.resolve());

const user = userEvent.setup();

describe('FormContainer', () => {
  afterEach(jest.clearAllMocks);

  it('Renders children', async () => {
    const childComponentTestid = 'childComponent';
    const childComponent = <div data-testid={childComponentTestid}/>;
    await render({ children: childComponent });
    expect(screen.getByTestId(childComponentTestid)).toBeInTheDocument();
  });

  it('should edit the container when clicking on the container', async () => {
    await render();

    const container = screen.getByText(`${textMock('ux_editor.component_group')} - $${container1IdMock}`);
    await act(() => user.click(container));

    expect(handleEditMock).toBeCalledTimes(1);
  });
});

const render = async (props: Partial<IFormContainerProps> = {}) => {
  const allProps: IFormContainerProps = {
    isBaseContainer: false,
    id: container1IdMock,
    container: layoutMock.containers[container1IdMock],
    handleEdit: handleEditMock,
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
