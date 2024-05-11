import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResourceNarrowingListProps } from './ResourceNarrowingList';
import { ResourceNarrowingList } from './ResourceNarrowingList';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { PolicyRuleResource, PolicyEditorUsage } from '../../../types';

const mockResource1: PolicyRuleResource = { type: 'type1', id: 'id1' };
const mockResource2: PolicyRuleResource = { type: 'type2', id: 'id2' };
const mockResources: PolicyRuleResource[] = [mockResource1, mockResource2];

const mockUsageType: PolicyEditorUsage = 'app';

const mockNewText: string = 'test';

describe('ResourceNarrowingList', () => {
  afterEach(jest.clearAllMocks);

  const mockHandleInputChange = jest.fn();
  const mockHandleRemoveResource = jest.fn();
  const mockHandleClickAddResource = jest.fn();
  const mockHandleRemoveElement = jest.fn();
  const mockHandleCloneElement = jest.fn();
  const mockOnBlur = jest.fn();

  const defaultProps: ResourceNarrowingListProps = {
    resources: mockResources,
    handleInputChange: mockHandleInputChange,
    handleRemoveResource: mockHandleRemoveResource,
    handleClickAddResource: mockHandleClickAddResource,
    handleRemoveElement: mockHandleRemoveElement,
    handleCloneElement: mockHandleCloneElement,
    onBlur: mockOnBlur,
    usageType: mockUsageType,
  };

  it('renders the list of resources', () => {
    render(<ResourceNarrowingList {...defaultProps} />);

    const removeButtons = screen.getAllByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });
    const typeInputs = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    const idInputs = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));

    const numItems: number = mockResources.length;
    expect(removeButtons).toHaveLength(numItems);
    expect(typeInputs).toHaveLength(numItems);
    expect(idInputs).toHaveLength(numItems);

    const addButton = screen.getByText(textMock('policy_editor.narrowing_list_add_button'));
    expect(addButton).toBeInTheDocument();
  });

  it('does not show the delete button for the first resource when "usageType" is resource', () => {
    render(<ResourceNarrowingList {...defaultProps} usageType='resource' />);

    const removeButtons = screen.getAllByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });
    const numItems: number = mockResources.length;
    expect(removeButtons).toHaveLength(numItems - 1); // Minus first element which is readonly
  });

  it('calls "handleInputChange" when id or type is edited', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));
    user.type(idInput, mockNewText);
    await waitFor(() => expect(mockHandleInputChange).toHaveBeenCalledTimes(mockNewText.length));

    mockHandleInputChange.mockClear();

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    user.type(typeInput, mockNewText);
    await waitFor(() => expect(mockHandleInputChange).toHaveBeenCalledTimes(mockNewText.length));
  });

  it('calls "handleRemoveResource" when remove resource button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [deleteResourceButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    user.click(deleteResourceButton);

    await waitFor(() => expect(mockHandleRemoveResource).toHaveBeenCalledTimes(1));
  });

  it('calls "handleClickAddResource" when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const addResourceButton = screen.getByRole('button', {
      name: textMock('policy_editor.narrowing_list_add_button'),
    });

    user.click(addResourceButton);

    await waitFor(() => expect(mockHandleClickAddResource).toHaveBeenCalledTimes(1));
  });

  it('calls "handleRemoveElement" when remove element button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [moreButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.more'),
    });
    user.click(moreButton);

    const [deleteElementButton] = await screen.findAllByRole('menuitem', {
      name: textMock('general.delete'),
    });
    user.click(deleteElementButton);

    await waitFor(() => expect(mockHandleRemoveElement).toHaveBeenCalledTimes(1));
  });

  it('calls "handleCloneElement" when clone element button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [moreButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.more'),
    });
    user.click(moreButton);

    const [cloneElementButton] = await screen.findAllByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    user.click(cloneElementButton);

    await waitFor(() => expect(mockHandleCloneElement).toHaveBeenCalledTimes(1));
  });

  it('calls "onBlur" when a textfield is left', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );

    await waitFor(() => user.type(typeInput, mockNewText));
    user.tab();
    await waitFor(() => expect(mockOnBlur).toHaveBeenCalledTimes(1));
  });
});
