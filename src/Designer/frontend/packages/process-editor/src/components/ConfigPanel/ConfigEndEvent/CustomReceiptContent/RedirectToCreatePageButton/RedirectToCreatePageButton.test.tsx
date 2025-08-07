import React from 'react';
import { RedirectToCreatePageButton } from './RedirectToCreatePageButton';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import { BpmnContext } from '../../../../../contexts/BpmnContext';
import { BpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnContextValue,
  mockBpmnApiContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import userEvent from '@testing-library/user-event';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('RedirectToCreatePageButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Calls navigate when the button is clicked', async () => {
    const user = userEvent.setup();
    renderRedirectToCreatePageButton();

    const navigationButton = screen.getByRole('link', {
      name: textMock('process_editor.configuration_panel_custom_receipt_navigate_to_design_link'),
    });

    await user.click(navigationButton);
    expect(mockNavigate).toHaveBeenCalledWith('/testOrg/testApp/ui-editor/layoutSet/testId');
  });
});

const renderRedirectToCreatePageButton = () => {
  return render(
    <TestAppRouter>
      <BpmnApiContext.Provider
        value={{ ...mockBpmnApiContextValue, existingCustomReceiptLayoutSetId: 'testId' }}
      >
        <BpmnContext.Provider value={mockBpmnContextValue}>
          <BpmnConfigPanelFormContextProvider>
            <RedirectToCreatePageButton />
          </BpmnConfigPanelFormContextProvider>
        </BpmnContext.Provider>
      </BpmnApiContext.Provider>
    </TestAppRouter>,
  );
};
