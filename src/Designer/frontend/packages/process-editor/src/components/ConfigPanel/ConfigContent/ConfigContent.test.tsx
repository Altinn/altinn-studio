import React from 'react';
import { ConfigContent } from './ConfigContent';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnContext } from '../../../contexts/BpmnContext';
import userEvent from '@testing-library/user-event';
import { BpmnApiContext } from '../../../contexts/BpmnApiContext';
import type { BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import { type BpmnTaskType } from '../../../types/BpmnTaskType';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { getMockBpmnElementForTask, mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../test/mocks/bpmnContextMock';
import { useStudioRecommendedNextActionContext } from '@studio/components-legacy';

const tasks = [
  {
    id: 'task_1',
    businessObject: {
      extensionElements: {
        values: [{ taskType: 'signing' }],
      },
    },
  },
  {
    id: 'task_2',
    businessObject: {
      extensionElements: {
        values: [{ taskType: 'signing' }],
      },
    },
  },
];

jest.mock('../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getAllTasksByType: jest.fn().mockReturnValue(tasks),
      };
    }),
  };
});

(useStudioRecommendedNextActionContext as jest.Mock).mockReturnValue({
  removeAction: jest.fn(),
  addAction: jest.fn(),
  shouldDisplayAction: jest.fn(),
});

jest.mock(
  '@studio/components-legacy/src/components/StudioRecommendedNextAction/context/useStudioRecommendedNextActionContext.ts',
  () => ({
    useStudioRecommendedNextActionContext: jest.fn(),
  }),
);

describe('ConfigContent', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should render heading for selected task', () => {
    renderConfigContent();
    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_data_task'),
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it('should render helpText for selected task', async () => {
    const user = userEvent.setup();
    renderConfigContent();

    const helpTextButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_header_help_text_title'),
    });
    await user.click(helpTextButton);

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_header_help_text_data')),
    ).toBeInTheDocument();
  });

  it('should render EditTaskId component', () => {
    renderConfigContent();

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_task_id'),
      }),
    ).toBeInTheDocument();
  });

  it.each(['data', 'confirmation', 'feedback', 'signing'])(
    'should render correct header config for each taskType',
    (taskType) => {
      renderConfigContent(
        {},
        {
          bpmnDetails: { ...mockBpmnDetails, taskType: taskType as BpmnTaskType },
        },
      );
      screen.getByRole('heading', {
        name: textMock(`process_editor.configuration_panel_${taskType}_task`),
        level: 2,
      });
      expect(screen.getByText(mockBpmnDetails.id)).toBeInTheDocument();
      expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
    },
  );

  it.each(['confirmation', 'feedback', 'signing'])(
    'should not render data type selector for task type %s',
    (taskType) => {
      renderConfigContent(
        {},
        {
          bpmnDetails: { ...mockBpmnDetails, taskType: taskType as BpmnTaskType },
        },
      );
      expect(
        screen.queryByRole('button', {
          name: textMock('process_editor.configuration_panel_set_data_model_link'),
        }),
      ).not.toBeInTheDocument();
    },
  );

  it('should render data type selector for task type data', () => {
    renderConfigContent();
    expect(
      screen.queryByRole('button', {
        name: textMock('process_editor.configuration_panel_set_data_model_link'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should display the connected data model as selected by default when data type is connected to task', () => {
    const connectedDataType = mockBpmnApiContextValue.layoutSets.sets[0].dataType;
    renderConfigContent();
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_data_model', {
          dataModelName: connectedDataType,
        }),
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(connectedDataType)).toBeInTheDocument();
  });

  it('should render the Policy accordion', async () => {
    renderConfigContent();
    const policyAccordion = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_policy_title'),
    });
    const user = userEvent.setup();
    await user.click(policyAccordion);
    const editPolicyLink = await screen.findByText(
      textMock('process_editor.configuration_panel.edit_policy_open_policy_editor_link'),
    );
    expect(editPolicyLink).toBeInTheDocument();
  });

  it('should render the Design accordion when a task has a connected layoutset', () => {
    renderConfigContent();
    const designAccordion = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_design_title'),
    });
    expect(designAccordion).toBeInTheDocument();
  });

  describe('Unique signature', () => {
    const element = getMockBpmnElementForTask('signing');
    element.businessObject.extensionElements.values[0].signatureConfig.uniqueFromSignaturesInDataTypes =
      { dataTypes: [] };

    it('should not show the unique signature field to first signing task', async () => {
      renderConfigContent(
        {},
        {
          bpmnDetails: {
            ...mockBpmnDetails,
            id: 'task_1',
            taskType: 'signing',
            element,
          },
        },
      );

      expect(
        screen.queryByRole('button', {
          name: textMock(
            'process_editor.configuration_panel_set_unique_from_signatures_in_data_types_link',
          ),
        }),
      ).not.toBeInTheDocument();
    });

    it('should show the unique signature field to other signing tasks', async () => {
      renderConfigContent(
        {},
        {
          bpmnDetails: {
            ...mockBpmnDetails,
            id: 'task_2',
            taskType: 'signing',
            element,
          },
        },
      );

      expect(
        screen.getByRole('button', {
          name: textMock(
            'process_editor.configuration_panel_set_unique_from_signatures_in_data_types_link',
          ),
        }),
      ).toBeInTheDocument();
    });

    it('should show recommended action when task is data and is in recommended action queue', async () => {
      const shouldDisplayAction = jest.fn().mockReturnValue(true);
      (useStudioRecommendedNextActionContext as jest.Mock).mockReturnValue({
        removeAction: jest.fn(),
        addAction: jest.fn(),
        shouldDisplayAction,
      });
      renderConfigContent();

      expect(shouldDisplayAction).toHaveBeenCalledWith(mockBpmnDetails.id);

      expect(
        screen.getByRole('textbox', {
          name: textMock('process_editor.recommended_action.new_name_label'),
        }),
      ).toBeInTheDocument();
    });
  });
});

const renderConfigContent = (
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
  rootContextProps: Partial<BpmnContextProps> = {},
) => {
  return render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
      <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...rootContextProps }}>
        <BpmnConfigPanelFormContextProvider>
          <ConfigContent />
        </BpmnConfigPanelFormContextProvider>
      </BpmnContext.Provider>
    </BpmnApiContext.Provider>,
  );
};
