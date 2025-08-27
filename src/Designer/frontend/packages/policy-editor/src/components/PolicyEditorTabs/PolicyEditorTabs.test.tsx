import { render, screen } from '@testing-library/react';
import React from 'react';
import { PolicyEditorTabs } from './PolicyEditorTabs';
import { PolicyEditorContext } from '../../contexts/PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../test/mocks/policyEditorContextMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

describe('PolicyEditorTabs', () => {
  it('should render summary tab selected by default', () => {
    renderPolicyEditorTabs();
    expect(screen.getByText(textMock('policy_editor.summary_heading'))).toBeInTheDocument();
  });

  it('should switch to rules tab when rules tab is clicked', async () => {
    const user = userEvent.setup();
    renderPolicyEditorTabs();
    const rulesTab = screen.getByText(textMock('policy_editor.rules_edit'));
    await user.click(rulesTab);
    expect(screen.getByText(textMock('policy_editor.card_button_text'))).toBeInTheDocument();
  });
});

const renderPolicyEditorTabs = () => {
  return render(
    <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
      <PolicyEditorTabs />
    </PolicyEditorContext.Provider>,
  );
};
