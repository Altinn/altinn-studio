import React from 'react';
import { ConfigContent } from './ConfigContent';
import { render, screen } from '@testing-library/react';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import {BpmnContextProps, BpmnContextProvider} from '../../../contexts/BpmnContext';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import userEvent from '@testing-library/user-event';
import type Modeler from 'bpmn-js/lib/Modeler';
import { type BpmnTaskType } from '../../../types/BpmnTaskType';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { BpmnApiContextProvider } from '../../../contexts/BpmnApiContext';
import type { BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';

const mockTaskId: string = 'testId';
const mockName: string = 'testName';

const mockBpmnDetails: BpmnDetails = {
  id: mockTaskId,
  name: mockName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};

const mockBpmnApiContextValue: Partial<BpmnApiContextProps> = {
  layoutSets: { sets: [] },
  availableDataModelIds: [],
};

const mockBpmnContextValue: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  appLibVersion: mockAppLibVersion8,
  getUpdatedXml: jest.fn(),
  isEditAllowed: true,
  bpmnDetails: mockBpmnDetails,
  setBpmnDetails: jest.fn(),
};

jest.mock('../../../hooks/useBpmnModeler', () => ({
  useBpmnModeler: () => ({
    getModeler: () => ({
      get: () => ({
        updateProperties: jest.fn(),
      }),
    }),
  }),
}));

describe('ConfigContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render heading for selected task', () => {
    renderConfigContent({}, {
      modelerRef: { current: { get: () => {} } as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });
    screen.getByRole('heading', {
      name: textMock('process_editor.configuration_panel_data_task'),
      level: 2,
    });
  });

  it('should render helpText for selected task', async () => {
    const user = userEvent.setup();
    renderConfigContent({}, {
      modelerRef: { current: { get: () => {} } as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });

    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_header_help_text_title'),
    });
    await user.click(helpTextButton);

    screen.getByText(textMock('process_editor.configuration_panel_header_help_text_data'));
  });

  it('should render EditTaskId component', () => {
    renderConfigContent({}, {
      modelerRef: { current: { get: () => {} } as unknown as Modeler },
      bpmnDetails: { ...mockBpmnDetails, taskType: 'data' as BpmnTaskType },
    });

    screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
  });

  it.each(['data', 'confirmation', 'feedback', 'signing'])(
    'should render correct header config for each taskType',
    (taskType) => {
      renderConfigContent({}, {
        modelerRef: { current: { get: () => {} } as unknown as Modeler },
        bpmnDetails: { ...mockBpmnDetails, taskType: taskType as BpmnTaskType },
      });
        screen.getByRole('heading', {
            name: textMock(`process_editor.configuration_panel_${taskType}_task`),
            level: 2,
        });
        
  it('should display the data type details about the selected task when a "data" task is selected', () => {
      renderConfigContent({}, {
          modelerRef: { current: { get: () => {} } as unknown as Modeler },
          bpmnDetails: { ...mockBpmnDetails, taskType: 'data' },
      });
      screen.getByRole('combobox', {
          name: textMock('process_editor.configuration_panel_set_datamodel'),
      });
    screen.getByText(mockBpmnDetails.id);
    screen.getByText(mockBpmnDetails.name);
    screen.getByText(textMock('process_editor.configuration_panel_no_datamodel'));
  });

        it('should display the details about the selected task when a task not of type "BpmnTaskType" is selected', () => {
            renderConfigContent({}, { bpmnDetails: { ...mockBpmnDetails, taskType: undefined } });

            screen.getByRole('heading', {
                    name: textMock('process_editor.configuration_panel_missing_task'),
                    level: 2,
                });
            screen.getByRole('combobox', {
                    name: textMock('process_editor.configuration_panel_set_datamodel'),
                });

            screen.getByText(mockBpmnDetails.id);
            screen.getByText(mockBpmnDetails.name);
            screen.getByText(textMock('process_editor.configuration_panel_no_datamodel'));
        });

        it('should display the connected data model as selected in the select list by default when data type is connected to task and no available data types exists', () => {
            const connectedDataType = 'dataModel0';
            const existingLayoutSets: LayoutSets = {
                sets: [
                    {
                        id: 'layoutSet1',
                        tasks: [mockTaskId],
                        dataType: connectedDataType,
                    },
                ],
            };
            renderConfigContent({ layoutSets: existingLayoutSets });
            const selectDataModel = screen.getByRole('combobox', {
                name: textMock('process_editor.configuration_panel_set_datamodel'),
            });
            expect(selectDataModel).toBeInTheDocument();
            expect(selectDataModel).toHaveValue(connectedDataType);
        });

        it('should display the default text as selected in the select list when no data type is connected to task and there are available data types', () => {
            const availableDataTypes = ['dataModel1', 'dataModel2'];
            renderConfigContent({ availableDataModelIds: availableDataTypes });
            const selectDataModel = screen.getByRole('combobox', {
                name: textMock('process_editor.configuration_panel_set_datamodel'),
            });
            expect(selectDataModel).toBeInTheDocument();
            expect(selectDataModel).toHaveValue('noModel');
            expect(
                screen.getByRole('option', {
                    name: textMock('process_editor.configuration_panel_no_datamodel'),
                }),
            ).toBeInTheDocument();
        });

        it('should display all available data types including existing and no-model-option as options for data type select', () => {
            const availableDataTypes = ['dataModel1', 'dataModel2'];
            const connectedDataType = 'dataModel0';
            const existingLayoutSets: LayoutSets = {
                sets: [
                    {
                        id: 'layoutSet1',
                        tasks: [mockTaskId],
                        dataType: connectedDataType,
                    },
                ],
            };
            renderConfigContent({ availableDataModelIds: availableDataTypes, layoutSets: existingLayoutSets });
            const selectDataModel = screen.getByRole('combobox', {
                name: textMock('process_editor.configuration_panel_set_datamodel'),
            });
            expect(selectDataModel).toBeInTheDocument();
            expect(selectDataModel).toHaveValue(connectedDataType);
            expect(
                screen.getByRole('option', {
                    name: textMock('process_editor.configuration_panel_no_datamodel'),
                }),
            ).toBeInTheDocument();

            availableDataTypes.forEach((dataType) =>
                expect(screen.getByRole('option', { name: dataType })).toBeInTheDocument(),
            );
        });
    });
});

const renderConfigContent = (bpmnApiContextProps: Partial<BpmnApiContextProps> = {},bpmnConfigPanelFormContextProps: Partial<BpmnContextProps> = {}) => {
  return render(
      <BpmnContextProvider>
      <BpmnApiContextProvider { ...mockBpmnApiContextValue} {...bpmnApiContextProps }>
    <BpmnConfigPanelFormContextProvider { ...mockBpmnContextValue} {...bpmnConfigPanelFormContextProps }>
          <ConfigContent />
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>
    </BpmnContextProvider>
  );
};
