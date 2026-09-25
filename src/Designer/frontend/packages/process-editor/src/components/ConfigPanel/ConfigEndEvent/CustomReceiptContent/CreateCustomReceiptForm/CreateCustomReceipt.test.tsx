import { CreateCustomReceipt } from './CreateCustomReceipt';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { BpmnContext } from '../../../../../contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../../../test/mocks/bpmnContextMock';
import { queryOptionMock } from '../../../../../../test/mocks/queryOptionMock';
import { PROTECTED_TASK_NAME_CUSTOM_RECEIPT } from 'app-shared/constants';
import type { AppVersion } from 'app-shared/types/AppVersion';

const mockAddLayoutSet = jest.fn().mockImplementation(queryOptionMock);
const mockOnCloseForm = jest.fn();
const mockAllDataModelIds: string[] = ['model1', 'model2'];

const nameFieldLabel = textMock(
  'process_editor.configuration_panel_custom_receipt_textfield_label',
);
const dataModelLabel = textMock(
  'process_editor.configuration_panel_custom_receipt_select_data_model_label',
);
const createButtonName = textMock(
  'process_editor.configuration_panel_custom_receipt_create_button',
);

const legacyVersion: AppVersion = { backendVersion: '8.9.0', frontendVersion: '4.25.2' };
const v9Version: AppVersion = { backendVersion: '9.0.0', frontendVersion: '4.25.2' };

describe('CreateCustomReceipt', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the editable name field for apps older than v9', () => {
    renderCreateCustomReceipt({ appVersion: legacyVersion });
    expect(screen.getByLabelText(nameFieldLabel)).toBeInTheDocument();
  });

  it('does not render the name field from v9, where the name is fixed to the task name', () => {
    renderCreateCustomReceipt({ appVersion: v9Version });
    expect(screen.queryByLabelText(nameFieldLabel)).not.toBeInTheDocument();
  });

  it('creates a custom receipt with the fixed name from v9 when a data model is selected', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceipt({ appVersion: v9Version });

    await selectDataModel(user, mockAllDataModelIds[0]);
    await user.click(screen.getByRole('button', { name: createButtonName }));

    expect(mockAddLayoutSet).toHaveBeenCalledTimes(1);
    expect(mockAddLayoutSet).toHaveBeenCalledWith(
      {
        layoutSetConfig: {
          id: PROTECTED_TASK_NAME_CUSTOM_RECEIPT,
          dataType: mockAllDataModelIds[0],
        },
      },
      { onSuccess: expect.any(Function) },
    );
    expect(mockOnCloseForm).toHaveBeenCalledTimes(1);
  });

  it('displays a data model error from v9 when no data model is selected', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceipt({ appVersion: v9Version });

    await user.click(screen.getByRole('button', { name: createButtonName }));

    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel_custom_receipt_create_data_model_error'),
      ),
    ).toBeInTheDocument();
    expect(mockAddLayoutSet).not.toHaveBeenCalled();
  });

  it('calls "onCloseForm" when the cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateCustomReceipt({ appVersion: v9Version });

    await user.click(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_custom_receipt_cancel_button'),
      }),
    );
    expect(mockOnCloseForm).toHaveBeenCalledTimes(1);
  });
});

const selectDataModel = async (user: UserEvent, dataModel: string) => {
  await user.type(screen.getByLabelText(dataModelLabel), dataModel);
  const option = await screen.findByRole('option', { name: dataModel, hidden: true });
  await user.click(option);
};

const defaultBpmnApiContextProps: BpmnApiContextProps = {
  ...mockBpmnApiContextValue,
  allDataModelIds: mockAllDataModelIds,
  addLayoutSet: mockAddLayoutSet,
};

type RenderProps = {
  appVersion: AppVersion;
  bpmnApiContextProps: Partial<BpmnApiContextProps>;
};

const renderCreateCustomReceipt = ({
  appVersion,
  bpmnApiContextProps,
}: Partial<RenderProps> = {}) => {
  return render(
    <BpmnApiContext.Provider value={{ ...defaultBpmnApiContextProps, ...bpmnApiContextProps }}>
      <BpmnContext.Provider
        value={{
          ...mockBpmnContextValue,
          appVersion: appVersion ?? mockBpmnContextValue.appVersion,
        }}
      >
        <BpmnConfigPanelFormContextProvider>
          <CreateCustomReceipt onCloseForm={mockOnCloseForm} />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
