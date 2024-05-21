import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPolicy } from './EditPolicy';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import {
  type BpmnApiContextProps,
  BpmnApiContextProvider,
} from '../../../../contexts/BpmnApiContext';
import { mockBpmnApiContextValue } from '../../../../../test/mocks/bpmnContextMock';

describe('EditPolicy', () => {
  it('should render', () => {
    renderEditPolicy(<EditPolicy />);
    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel.edit_policy_open_policy_editor_button'),
      ),
    ).toBeInTheDocument();
  });

  it('should call openPolicyEditor when button is clicked', async () => {
    const openPolicyEditor = jest.fn();
    renderEditPolicy(<EditPolicy />, { openPolicyEditor });
    const user = userEvent.setup();
    const button = screen.getByText(
      textMock('process_editor.configuration_panel.edit_policy_open_policy_editor_button'),
    );
    await user.click(button);
    expect(openPolicyEditor).toHaveBeenCalledTimes(1);
  });

  it('should render informative message', () => {
    renderEditPolicy(<EditPolicy />);
    expect(
      screen.getByText(textMock('process_editor.configuration_panel.edit_policy_alert_message')),
    ).toBeInTheDocument();
  });
});

const renderEditPolicy = (
  children: React.ReactNode,
  contextProps?: Partial<BpmnApiContextProps>,
) => {
  return render(
    <BpmnApiContextProvider {...mockBpmnApiContextValue} {...contextProps}>
      {children}
    </BpmnApiContextProvider>,
  );
};
