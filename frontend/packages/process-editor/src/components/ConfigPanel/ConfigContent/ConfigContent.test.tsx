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
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import {
  mockBpmnApiContextValue,
  mockBpmnContextValue,
} from '../../../../test/mocks/bpmnContextMock';

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
          name: textMock('process_editor.configuration_panel_set_datamodel_link'),
        }),
      ).not.toBeInTheDocument();
    },
  );

  it('should render data type selector for task type data', () => {
    renderConfigContent();
    expect(
      screen.queryByRole('button', {
        name: textMock('process_editor.configuration_panel_set_datamodel_link'),
      }),
    ).not.toBeInTheDocument();
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

  it('should display the connected data model as selected by default when data type is connected to task', () => {
    const connectedDataType = mockBpmnApiContextValue.layoutSets.sets[0].dataType;
    renderConfigContent();
    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_set_datamodel'),
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
    const editPolicyButton = await screen.findByText(
      textMock('process_editor.configuration_panel.edit_policy_open_policy_editor_button'),
    );
    expect(editPolicyButton).toBeInTheDocument();
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
