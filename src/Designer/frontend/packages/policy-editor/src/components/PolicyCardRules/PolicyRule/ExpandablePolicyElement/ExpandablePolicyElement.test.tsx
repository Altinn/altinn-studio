import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ExpandablePolicyElementProps } from './ExpandablePolicyElement';
import { ExpandablePolicyElement } from './ExpandablePolicyElement';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  PolicyEditorContext,
  type PolicyEditorContextProps,
} from '../../../../contexts/PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../../../test/mocks/policyEditorContextMock';

const mockTitle: string = 'Test';
const mockTextChildren: string = 'Test Content';
const mockChildren: React.ReactNode = <p>{mockTextChildren}</p>;

describe('ExpandablePolicyElement', () => {
  afterEach(jest.clearAllMocks);

  it('renders the component with the provided title and children', () => {
    renderExpandablePolicyElement({}, { usageType: 'resource' });

    const expandButton = screen.getByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    expect(expandButton).toBeInTheDocument();

    const contentElement = screen.getByText(mockTextChildren);
    expect(contentElement).toBeInTheDocument();
  });

  it('renders with open state when usageType is resource', () => {
    renderExpandablePolicyElement({}, { usageType: 'resource' });

    const expandButtonClosedBefore = screen.getByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    const expandButtonOpenedBefore = screen.queryByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_open_icon')}`,
    });

    expect(expandButtonClosedBefore).toBeInTheDocument();
    expect(expandButtonOpenedBefore).not.toBeInTheDocument();
  });

  it('renders with description in header when provided', () => {
    const mockRuleDescription = 'Test Description';
    renderExpandablePolicyElement({ description: mockRuleDescription });

    const descriptionElement = screen.getByText(mockRuleDescription);
    expect(descriptionElement).toBeInTheDocument();
  });

  it('renders with closed state when usageType is app', () => {
    renderExpandablePolicyElement({}, { usageType: 'app' });
    const expandButtonClosedBefore = screen.queryByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    const expandButtonOpenedBefore = screen.getByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_open_icon')}`,
    });

    expect(expandButtonClosedBefore).not.toBeInTheDocument();
    expect(expandButtonOpenedBefore).toBeInTheDocument();
  });

  it('toggles open/close state when the expand button is clicked', async () => {
    const user = userEvent.setup();
    renderExpandablePolicyElement({}, { usageType: 'resource' });

    const expandButtonClosedBefore = screen.getByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    const expandButtonOpenedBefore = screen.queryByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_open_icon')}`,
    });

    expect(expandButtonClosedBefore).toBeInTheDocument();
    expect(expandButtonOpenedBefore).not.toBeInTheDocument();

    await user.click(expandButtonClosedBefore);

    const expandButtonClosedAfter = screen.queryByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_close_icon')}`,
    });
    const expandButtonOpenedAfter = screen.getByRole('button', {
      name: `${mockTitle} ${textMock('policy_editor.expandable_card_open_icon')}`,
    });

    expect(screen.queryByText(mockTextChildren)).not.toBeInTheDocument();
    expect(expandButtonClosedAfter).not.toBeInTheDocument();
    expect(expandButtonOpenedAfter).toBeInTheDocument();

    await user.click(expandButtonOpenedAfter);

    expect(screen.getByText(mockTextChildren)).toBeInTheDocument();
  });

  it('calls handleRemoveElement when the "Delete" option in the dropdown menu is clicked', async () => {
    const user = userEvent.setup();
    const mockHandleRemoveElement = jest.fn();
    renderExpandablePolicyElement({ handleRemoveElement: mockHandleRemoveElement });

    const moreButton = screen.getByRole('button', {
      name: textMock('policy_editor.more'),
    });
    await user.click(moreButton);

    const deleteOption = screen.getByRole('menuitem', { name: textMock('general.delete') });
    await user.click(deleteOption);

    expect(mockHandleRemoveElement).toHaveBeenCalledTimes(1);
  });

  it('calls handleCloneElement when the "Copy" option in the dropdown menu is clicked', async () => {
    const user = userEvent.setup();
    const mockHandleCloneElement = jest.fn();
    renderExpandablePolicyElement({ handleCloneElement: mockHandleCloneElement });

    const moreButton = screen.getByRole('button', {
      name: textMock('policy_editor.more'),
    });
    await user.click(moreButton);

    const cloneOption = screen.getByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await user.click(cloneOption);

    expect(mockHandleCloneElement).toHaveBeenCalledTimes(1);
  });
});

const renderExpandablePolicyElement = (
  props: Partial<ExpandablePolicyElementProps> = {},
  context: Partial<PolicyEditorContextProps> = {},
) => {
  const defaultProps: ExpandablePolicyElementProps = {
    title: mockTitle,
    handleRemoveElement: jest.fn(),
    handleCloneElement: jest.fn(),
    children: mockChildren,
  };

  return render(
    <PolicyEditorContext.Provider value={{ ...mockPolicyEditorContextValue, ...context }}>
      <ExpandablePolicyElement {...defaultProps} {...props} />
    </PolicyEditorContext.Provider>,
  );
};
