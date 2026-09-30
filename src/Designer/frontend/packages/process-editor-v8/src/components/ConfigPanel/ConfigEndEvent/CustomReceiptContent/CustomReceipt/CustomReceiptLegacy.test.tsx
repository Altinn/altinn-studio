import { CustomReceiptLegacy } from './CustomReceiptLegacy';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { BpmnContext } from '../../../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import { type LayoutSetConfig } from 'app-shared/types/api/LayoutSetsResponse';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import { TestAppRouter } from '@studio/testing/testRoutingUtils';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const invalidFormatLayoutSetName: string = 'Receipt/';
const emptyLayoutSetName: string = '';
const existingLayoutSetName: string = 'layoutSetName1';

const existingCustomReceiptLayoutSetId: string = mockBpmnApiContextValue.layoutSets[0].id;
const layoutSetWithCustomReceipt: LayoutSetConfig = {
  id: existingCustomReceiptLayoutSetId,
  taskId: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
};
const layoutSetWithDataTask: LayoutSetConfig = {
  id: existingLayoutSetName,
  taskId: 'Task_1',
};

const layoutSetIdTextKeys: Record<string, string> = {
  [emptyLayoutSetName]: 'validation_errors.required',
  [invalidFormatLayoutSetName]: 'validation_errors.name_invalid',
  [existingLayoutSetName]: 'process_editor.configuration_panel_layout_set_id_not_unique',
};

const mockAllDataModelIds: string[] = [
  mockBpmnApiContextValue.layoutSets[0].dataType,
  mockBpmnApiContextValue.layoutSets[1].dataType,
];

const defaultBpmnApiContextProps: BpmnApiContextProps = {
  ...mockBpmnApiContextValue,
  existingCustomReceiptLayoutSetId: existingCustomReceiptLayoutSetId,
  allDataModelIds: mockAllDataModelIds,
};

describe('CustomReceiptLegacy', () => {
  afterEach(() => jest.clearAllMocks());

  it('calls "mutateLayoutSetId" when the layoutSet id is changed', async () => {
    const user = userEvent.setup();
    renderCustomReceiptLegacy();

    await openNameField(user);

    const textfield = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    const newLayoutSetId: string = 'Test2';
    await user.clear(textfield);
    await user.type(textfield, newLayoutSetId);
    await user.tab();

    expect(mockBpmnApiContextValue.mutateLayoutSetId).toHaveBeenCalledTimes(1);
    expect(mockBpmnApiContextValue.mutateLayoutSetId).toHaveBeenCalledWith({
      layoutSetIdToUpdate: existingCustomReceiptLayoutSetId,
      newLayoutSetId,
    });
  });

  it('does not call "mutateLayoutSetId" when the layoutSet id is changed to the original id', async () => {
    const user = userEvent.setup();
    renderCustomReceiptLegacy();

    await openNameField(user);

    const textfield = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );
    await user.clear(textfield);
    await user.type(textfield, existingCustomReceiptLayoutSetId);
    await user.tab();

    expect(mockBpmnApiContextValue.mutateLayoutSetId).not.toHaveBeenCalled();
  });

  it.each([
    invalidFormatLayoutSetName,
    emptyLayoutSetName,
    existingLayoutSetName,
    existingCustomReceiptLayoutSetId,
  ])('shows correct errormessage when layoutSetId is %s', async (invalidLayoutSetId: string) => {
    const user = userEvent.setup();
    renderCustomReceiptLegacy({
      layoutSets: [layoutSetWithCustomReceipt, layoutSetWithDataTask],
    });

    await openNameField(user);

    const inputField = screen.getByLabelText(
      textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
    );

    await user.clear(inputField);
    if (invalidLayoutSetId !== emptyLayoutSetName) await user.type(inputField, invalidLayoutSetId);
    await user.tab();

    const errorTextKey = layoutSetIdTextKeys[invalidLayoutSetId];

    if (errorTextKey) {
      const error = screen.getByText(textMock(errorTextKey));
      expect(error).toBeInTheDocument();
    }

    expect(mockBpmnApiContextValue.mutateLayoutSetId).not.toHaveBeenCalled();
  });
});

const openNameField = async (user: ReturnType<typeof userEvent.setup>) => {
  const toggleableTextfieldButton = screen.getByRole('button', {
    name: textMock('process_editor.configuration_panel_custom_receipt_textfield_label'),
  });
  await user.click(toggleableTextfieldButton);
};

const renderCustomReceiptLegacy = (bpmnApiContextProps: Partial<BpmnApiContextProps> = {}) => {
  const queryClient = createQueryClientMock();
  return render(
    <TestAppRouter>
      <ServicesContextProvider {...queriesMock} client={queryClient}>
        <BpmnApiContext.Provider value={{ ...defaultBpmnApiContextProps, ...bpmnApiContextProps }}>
          <BpmnContext.Provider value={mockBpmnContextValue}>
            <BpmnConfigPanelFormContextProvider>
              <CustomReceiptLegacy />
            </BpmnConfigPanelFormContextProvider>
          </BpmnContext.Provider>
        </BpmnApiContext.Provider>
      </ServicesContextProvider>
    </TestAppRouter>,
  );
};
