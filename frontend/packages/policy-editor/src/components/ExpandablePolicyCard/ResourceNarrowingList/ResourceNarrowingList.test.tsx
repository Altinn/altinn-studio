import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResourceNarrowingListProps } from './ResourceNarrowingList';
import { ResourceNarrowingList } from './ResourceNarrowingList';
import { act } from 'react-dom/test-utils';
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
    await act(() => user.type(idInput, mockNewText));
    expect(mockHandleInputChange).toHaveBeenCalledTimes(mockNewText.length);

    mockHandleInputChange.mockClear();

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    await act(() => user.type(typeInput, mockNewText));
    expect(mockHandleInputChange).toHaveBeenCalledTimes(mockNewText.length);
  });

  it('calls "handleRemoveResource" when remove resource button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [deleteResourceButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    await act(() => user.click(deleteResourceButton));

    expect(mockHandleRemoveResource).toHaveBeenCalledTimes(1);
  });

  it('calls "handleClickAddResource" when add button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const addResourceButton = screen.getByRole('button', {
      name: textMock('policy_editor.narrowing_list_add_button'),
    });

    await act(() => user.click(addResourceButton));

    expect(mockHandleClickAddResource).toHaveBeenCalledTimes(1);
  });

  it('calls "handleRemoveElement" when remove element button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [moreButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.more'),
    });
    await act(() => user.click(moreButton));

    const [deleteElementButton] = screen.getAllByRole('menuitem', {
      name: textMock('general.delete'),
    });
    await act(() => user.click(deleteElementButton));

    expect(mockHandleRemoveElement).toHaveBeenCalledTimes(1);
  });

  it('calls "handleCloneElement" when clone element button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [moreButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.more'),
    });
    await act(() => user.click(moreButton));

    const [cloneElementButton] = screen.getAllByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await act(() => user.click(cloneElementButton));

    expect(mockHandleCloneElement).toHaveBeenCalledTimes(1);
  });

  it('calls "onBlur" when a textfield is left', async () => {
    const user = userEvent.setup();
    render(<ResourceNarrowingList {...defaultProps} />);

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );

    await act(() => user.type(typeInput, mockNewText));
    await act(() => user.tab());
    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });
});
