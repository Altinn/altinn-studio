import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigEndEvent } from './ConfigEndEvent';
import userEvent from '@testing-library/user-event';
import { BpmnContext, type BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../test/mocks/bpmnContextMock';

describe('ConfigEndEvent', () => {
  afterEach(() => jest.clearAllMocks());

  it('should display the header for end event', () => {
    renderConfigEndEventPanel();

    const header = screen.getByText(textMock('process_editor.configuration_panel_end_event'));
    expect(header).toBeInTheDocument();
  });

  it('should hide the custom receipt content behind closed accordion initially', () => {
    renderConfigEndEventPanel();

    const accordion = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_accordion_header'),
    });

    expect(accordion).toHaveAttribute('aria-expanded', 'false');
  });

  it('should display the informal text, the link to read more, and the custom receipt content when opening the accordion', async () => {
    const user = userEvent.setup();
    renderConfigEndEventPanel();

    const accordion = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_accordion_header'),
    });
    await user.click(accordion);

    const informationTextDefaultReceipt = screen.getByText(
      textMock('process_editor.configuration_panel_custom_receipt_default_receipt_info'),
    );
    expect(informationTextDefaultReceipt).toBeVisible();

    const link = screen.getByRole('link', {
      name: textMock('process_editor.configuration_panel_custom_receipt_default_receipt_link'),
    });
    expect(link).toBeVisible();

    const informationTextCustomReceipt = screen.getByText(
      textMock('process_editor.configuration_panel_custom_receipt_info'),
    );
    expect(informationTextCustomReceipt).toBeVisible();

    const createButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_create_your_own_button'),
    });
    expect(createButton).toBeVisible();
  });
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  rootContextProps: Partial<BpmnContextProps>;
};

const renderConfigEndEventPanel = (props: Partial<RenderProps> = {}) => {
  const { bpmnApiContextProps, rootContextProps } = props;

  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <ConfigEndEvent />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
