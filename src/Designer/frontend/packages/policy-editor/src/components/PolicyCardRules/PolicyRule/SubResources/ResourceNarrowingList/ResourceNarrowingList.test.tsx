import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResourceNarrowingListProps } from './ResourceNarrowingList';
import { ResourceNarrowingList } from './ResourceNarrowingList';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { PolicyRuleResource } from '../../../../../types';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../../../contexts/PolicyEditorContext';
import { PolicyRuleContext } from '../../../../../contexts/PolicyRuleContext';
import { mockPolicyEditorContextValue } from '../../../../../../test/mocks/policyEditorContextMock';
import { mockPolicyRuleContextValue } from '../../../../../../test/mocks/policyRuleContextMock';

const mockResource1: PolicyRuleResource = { type: 'type1', id: 'id1' };
const mockResource2: PolicyRuleResource = { type: 'type2', id: 'id2' };
const mockResources: PolicyRuleResource[] = [mockResource1, mockResource2];

const mockNewText: string = 'test';

const defaultProps: ResourceNarrowingListProps = {
  resources: mockResources,
  resourceIndex: 0,
};

describe('ResourceNarrowingList', () => {
  afterEach(jest.clearAllMocks);

  it('renders the list of resources', async () => {
    renderResourceNarrowingList();

    const user = userEvent.setup();
    const toggleListButton = screen.getByRole('button', {
      name: `id1 - id2 ${textMock('policy_editor.expandable_card_open_icon')}`,
    });
    await user.click(toggleListButton);

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

  it('calls "setPolicyRules" and "savePolicy" when remove resource button is clicked', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const toggleListButton = screen.getByRole('button', {
      name: `id1 - id2 ${textMock('policy_editor.expandable_card_open_icon')}`,
    });
    await user.click(toggleListButton);

    const [deleteResourceButton] = screen.getAllByRole('button', {
      name: textMock('policy_editor.narrowing_list_field_delete'),
    });

    await user.click(deleteResourceButton);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });

  it('calls "setPolicyRules" and "savePolicy" when add button is clicked', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const toggleListButton = screen.getByRole('button', {
      name: `id1 - id2 ${textMock('policy_editor.expandable_card_open_icon')}`,
    });
    await user.click(toggleListButton);

    const addResourceButton = screen.getByRole('button', {
      name: textMock('policy_editor.narrowing_list_add_button'),
    });

    await user.click(addResourceButton);

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });

  it('calls "setPolicyRules" and "savePolicy" when remove element button is clicked', async () => {
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

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });

  it('calls "setPolicyRules" and "savePolicy" when clone element button is clicked', async () => {
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

    expect(mockPolicyEditorContextValue.setPolicyRules).toHaveBeenCalledTimes(1);
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });

  it('calls "savePolicy" when a textfield is left', async () => {
    const user = userEvent.setup();
    renderResourceNarrowingList();

    const toggleListButton = screen.getByRole('button', {
      name: `id1 - id2 ${textMock('policy_editor.expandable_card_open_icon')}`,
    });
    await user.click(toggleListButton);

    const [typeInput] = screen.getAllByLabelText(
      textMock('policy_editor.narrowing_list_field_type'),
    );

    await user.type(typeInput, mockNewText);
    await user.tab();
    expect(mockPolicyEditorContextValue.savePolicy).toHaveBeenCalledTimes(1);
  });
});

const renderResourceNarrowingList = (
  policyEditorContextProps: Partial<PolicyEditorContextProps> = {},
) => {
  return render(
    <PolicyEditorContext.Provider
      value={{ ...mockPolicyEditorContextValue, ...policyEditorContextProps }}
    >
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValue}>
        <ResourceNarrowingList {...defaultProps} />
      </PolicyRuleContext.Provider>
    </PolicyEditorContext.Provider>,
  );
};
