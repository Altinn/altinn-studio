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
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

describe('RedirectToCreatePageButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Renders link with correct href', async () => {
    renderRedirectToCreatePageButton();

    const navigationButton = screen.getByRole('link', {
      name: textMock('process_editor.configuration_panel_custom_receipt_navigate_to_design_link'),
    });

    expect(navigationButton).toHaveProperty(
      'href',
      'http://localhost/testOrg/testApp/ui-editor/layoutSet/testId',
    );
  });
});

const renderRedirectToCreatePageButton = () => {
  const queryClient = createQueryClientMock();
  return render(
    <TestAppRouter>
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        <BpmnApiContext.Provider
          value={{ ...mockBpmnApiContextValue, existingCustomReceiptLayoutSetId: 'testId' }}
        >
          <BpmnContext.Provider value={mockBpmnContextValue}>
            <BpmnConfigPanelFormContextProvider>
              <RedirectToCreatePageButton />
            </BpmnConfigPanelFormContextProvider>
          </BpmnContext.Provider>
        </BpmnApiContext.Provider>
      </ServicesContextProvider>
    </TestAppRouter>,
  );
};
