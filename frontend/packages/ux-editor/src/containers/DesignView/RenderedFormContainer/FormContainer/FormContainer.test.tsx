import React from 'react';
import { act, screen } from '@testing-library/react';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';
import type { IFormContainerProps } from './FormContainer';
import { FormContainer } from './FormContainer';
import { renderWithMockStore } from '../../../../testing/mocks';
import { container1IdMock, layoutMock } from '../../../../testing/layoutMock';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { useDeleteFormContainerMutation } from '../../../../hooks/mutations/useDeleteFormContainerMutation';
import { UseMutationResult } from '@tanstack/react-query';
import { IInternalLayout } from '../../../../types/global';

const handleDiscardMock = jest.fn();
const handleEditMock = jest.fn();
const handleSaveMock = jest.fn().mockImplementation(() => Promise.resolve());

const user = userEvent.setup();

jest.mock('../../../../hooks/mutations/useDeleteFormContainerMutation');
const mockDeleteFormContainer = jest.fn();
const mockUseDeleteFormContainerMutation = useDeleteFormContainerMutation as jest.MockedFunction<
  typeof useDeleteFormContainerMutation
>;
mockUseDeleteFormContainerMutation.mockReturnValue({
  mutate: mockDeleteFormContainer,
} as unknown as UseMutationResult<IInternalLayout, Error, string, unknown>);

describe('FormContainer', () => {
  afterEach(jest.clearAllMocks);

  it('Renders children', async () => {
    const childComponentTestid = 'childComponent';
    const childComponent = <div data-testid={childComponentTestid} />;
    await render({ children: childComponent });
    expect(screen.getByTestId(childComponentTestid)).toBeInTheDocument();
  });

  it('should delete when clicking the Delete button', async () => {
    await render({
      isEditMode: false,
    });

    const button = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(button));

    expect(mockUseDeleteFormContainerMutation).toHaveBeenCalledTimes(1);
  });

  it('should delete and discard when clicking the Delete button on the container being edited', async () => {
    await render({
      isEditMode: true,
    });

    const button = screen.getByRole('button', { name: textMock('general.delete') });
    await act(() => user.click(button));

    expect(mockUseDeleteFormContainerMutation).toHaveBeenCalledTimes(1);
  });

  it('should edit the container when clicking on the container', async () => {
    await render();

    const container = screen.getByText(
      textMock('ux_editor.component_group_header', { id: container1IdMock }),
    );
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
    handleSave: handleSaveMock,
    handleDiscard: handleDiscardMock,
    children: [],
    isEditMode: false,
    ...props,
  };

  return renderWithMockStore()(
    <DndProvider backend={HTML5Backend}>
      <FormContainer {...allProps} />
    </DndProvider>,
  );
};
