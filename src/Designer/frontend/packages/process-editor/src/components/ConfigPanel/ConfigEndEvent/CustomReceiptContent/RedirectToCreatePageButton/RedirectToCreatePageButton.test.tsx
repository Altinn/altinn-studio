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

describe('RedirectToCreatePageButton', () => {
  afterEach(() => jest.clearAllMocks());

  it('Checks that the button to go to "Utforming" page has the correct href', () => {
    renderRedirectToCreatePageButton();

    const navigationButton = screen.getByRole('link', {
      name: textMock('process_editor.configuration_panel_custom_receipt_navigate_to_design_link'),
    });
    expect(navigationButton).toHaveAttribute('href', '/editor/testOrg/testApp/ui-editor');
  });
});

const renderRedirectToCreatePageButton = () => {
  return render(
    <BpmnApiContext.Provider value={mockBpmnApiContextValue}>
      <BpmnContext.Provider value={mockBpmnContextValue}>
        <BpmnConfigPanelFormContextProvider>
          <RedirectToCreatePageButton />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
