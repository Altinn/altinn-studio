import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigServiceTask } from './ConfigServiceTask';
import { BpmnContext, type BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { mockBpmnContextValue } from '../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../types/BpmnDetails';

const tasks = [
  {
    id: 'task_1',
    businessObject: {
      name: 'Task 1',
      extensionElements: {
        values: [{ taskType: 'data' }],
      },
    },
  },
  {
    id: 'task_2',
    businessObject: {
      name: 'Task 2',
      extensionElements: {
        values: [{ taskType: 'data' }],
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

describe('ConfigServiceTask', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render EditTaskId component', () => {
    renderConfigServiceTask();

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_task_id'),
      }),
    ).toBeInTheDocument();
  });

  it('should render task name display tile', () => {
    renderConfigServiceTask();

    expect(screen.getByText(mockBpmnDetails.name)).toBeInTheDocument();
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_name_label')),
    ).toBeInTheDocument();
  });

  it('should not render pdf configuration for non-pdf service task', () => {
    renderConfigServiceTask();

    expect(
      screen.queryByRole('button', {
        name: textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should render pdf configuration for pdf service task', () => {
    const pdfBpmnDetails: BpmnDetails = {
      ...mockBpmnDetails,
      taskType: 'pdf',
      element: {
        ...mockBpmnDetails.element,
        businessObject: {
          ...mockBpmnDetails.element.businessObject,
          extensionElements: {
            values: [
              {
                pdfConfig: {
                  filename: { value: 'test.pdf' },
                  autoPdfTaskIds: { taskIds: [] },
                },
              },
            ],
          },
        },
      },
    };

    renderConfigServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
    });

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_pdf_service_task_filename'),
      }),
    ).toBeInTheDocument();
  });
});

type RenderProps = {
  bpmnContextProps: Partial<BpmnContextProps>;
};

const renderConfigServiceTask = (props: Partial<RenderProps> = {}) => {
  const { bpmnContextProps } = props;

  return render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
      <BpmnConfigPanelFormContextProvider>
        <ConfigServiceTask />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};
