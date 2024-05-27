import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResourceNarrowingListProps } from './ResourceNarrowingList';
import { ResourceNarrowingList } from './ResourceNarrowingList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { PolicyRuleResource } from '../../../types';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../contexts/PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../../test/mocks/policyEditorContextMock';

const mockResource1: PolicyRuleResource = { type: 'type1', id: 'id1' };
const mockResource2: PolicyRuleResource = { type: 'type2', id: 'id2' };
const mockResources: PolicyRuleResource[] = [mockResource1, mockResource2];

const mockNewText: string = 'test';

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
};

describe('ResourceNarrowingList', () => {
  afterEach(jest.clearAllMocks);

  it('renders the list of resources', () => {
    renderResourceNarrowingList();

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
    renderResourceNarrowingList({ usageType: 'resource' });

    const removeButtons = screen.getAllByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });
    const numItems: number = mockResources.length;
    expect(removeButtons).toHaveLength(numItems - 1); // Minus first element which is readonly
  });

  it('calls "handleInputChange" when id or type is edited', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const [idInput] = screen.getAllByLabelText(textMock('policy_editor.narrowing_list_field_id'));
    await user.type(idInput, mockNewText);
    expect(mockHandleInputChange).toHaveBeenCalledTimes(mockNewText.length);

    mockHandleInputChange.mockClear();

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );
    await user.type(typeInput, mockNewText);
    expect(mockHandleInputChange).toHaveBeenCalledTimes(mockNewText.length);
  });

  it('calls "handleRemoveResource" when remove resource button is clicked', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const [deleteResourceButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    await user.click(deleteResourceButton);

    expect(mockHandleRemoveResource).toHaveBeenCalledTimes(1);
  });

  it('calls "handleClickAddResource" when add button is clicked', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const addResourceButton = screen.getByRole('button', {
      name: textMock('policy_editor.narrowing_list_add_button'),
    });

    await user.click(addResourceButton);

    expect(mockHandleClickAddResource).toHaveBeenCalledTimes(1);
  });

  it('calls "handleRemoveElement" when remove element button is clicked', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const [moreButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.more'),
    });
    await user.click(moreButton);

    const [deleteElementButton] = screen.getAllByRole('menuitem', {
      name: textMock('general.delete'),
    });
    await user.click(deleteElementButton);

    expect(mockHandleRemoveElement).toHaveBeenCalledTimes(1);
  });

  it('calls "handleCloneElement" when clone element button is clicked', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const [moreButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.more'),
    });
    await user.click(moreButton);

    const [cloneElementButton] = screen.getAllByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await user.click(cloneElementButton);

    expect(mockHandleCloneElement).toHaveBeenCalledTimes(1);
  });

  it('calls "onBlur" when a textfield is left', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );

    await user.type(typeInput, mockNewText);
    await user.tab();
    expect(mockOnBlur).toHaveBeenCalledTimes(1);
  });
});

const renderResourceNarrowingList = (
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <ResourceNarrowingList {...defaultProps} />
    </PolicyEditorContext.Provider>,
  );
};
