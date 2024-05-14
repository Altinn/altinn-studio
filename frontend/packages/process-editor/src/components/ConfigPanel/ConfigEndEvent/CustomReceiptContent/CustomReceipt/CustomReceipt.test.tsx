import React from 'react';
import { CustomReceipt } from './CustomReceipt';
import { render, screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';
import { BpmnContext, type BpmnContextProps } from '../../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import { queryOptionMock } from 'app-shared/mocks/queryOptionMock';

const mockMutateLayoutSet = jest.fn(); //.mockImplementation(() => Promise.resolve());
const mockMutateDataType = jest.fn().mockImplementation(queryOptionMock);
const mockDeleteLayoutSet = jest.fn().mockImplementation(() => Promise.resolve());

const mockAvailableDatamodelIds: string[] = ['model1', 'model2'];
const mockExistingCustomReceiptLayoutSetId: string = 'Test';

const defaultBpmnContextProps: BpmnApiContextProps = {
  ...mockBpmnApiContextValue,
  existingCustomReceiptLayoutSetId: mockExistingCustomReceiptLayoutSetId,
  availableDataModelIds: mockAvailableDatamodelIds,
  mutateLayoutSet: mockMutateLayoutSet,
  mutateDataType: mockMutateDataType,
  deleteLayoutSet: mockDeleteLayoutSet,
};

describe('CustomReceipt', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls "mutateLayoutSet" when the layoutset id is changed', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();

    const toggleableTextfieldButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    });

    await user.click(toggleableTextfieldButton);

    const textfield = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    const newLayoutsetId: string = 'Test2';
    await user.clear(textfield);
    await user.type(textfield, newLayoutsetId);
    await user.tab();

    expect(mockMutateLayoutSet).toHaveBeenCalledTimes(1);
  });
  /*
  it('calls "mutateDataType" when the datamodel id is changed', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();
  });

  it('gives an error when trying to save layoutset id that is empty', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();
  });

  it('calls "deleteLayoutSet" when clicking delete layoutset', async () => {
    const user = userEvent.setup();
    renderCustomReceipt();
  });*/
});

type RenderProps = {
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
  rootContextProps: Partial<BpmnContextProps>;
};

const renderCustomReceipt = (props: Partial<RenderProps> = {}) => {
  const { bpmnApiContextProps, rootContextProps } = props;

  return render(
    <BpmnApiContext.Provider value={{ ...defaultBpmnContextProps, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <CustomReceipt />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
