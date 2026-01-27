import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigServiceTask } from './ConfigServiceTask';
import { BpmnContext, type BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import {
  mockBpmnContextValue,
  mockBpmnApiContextValue,
} from '../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { MemoryRouter } from 'react-router-dom';

type PdfBpmnDetailsConfig = {
  filenameTextResourceKey?: string;
  taskIds?: string[];
};

const createPdfBpmnDetails = (config: PdfBpmnDetailsConfig = {}): BpmnDetails => {
  const { filenameTextResourceKey = '', taskIds = [] } = config;
  return {
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
                filenameTextResourceKey: filenameTextResourceKey
                  ? { value: filenameTextResourceKey }
                  : undefined,
                autoPdfTaskIds: {
                  taskIds: taskIds.map((id) => ({ value: id })),
                },
              },
            },
          ],
        },
      },
    },
  };
};

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

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

jest.mock('app-shared/hooks/queries', () => ({
  useTextResourcesQuery: () => ({ data: { nb: [] } }),
}));

jest.mock('app-shared/hooks/mutations', () => ({
  useUpsertTextResourceMutation: () => ({ mutate: jest.fn() }),
}));

jest.mock('../../../hooks/useUpdatePdfConfigTaskIds', () => ({
  useUpdatePdfConfigTaskIds: () => jest.fn(),
}));

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
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      }),
    ).not.toBeInTheDocument();
  });

  it('should render pdf configuration for pdf service task', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({});

    renderConfigServiceTask({
      bpmnContextProps: {
        bpmnDetails: pdfBpmnDetails,
      },
      bpmnApiContextProps: {
        layoutSets: { sets: [] },
      },
    });

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      }),
    ).toBeInTheDocument();
  });
});

type RenderProps = {
  bpmnContextProps: Partial<BpmnContextProps>;
  bpmnApiContextProps?: Partial<BpmnApiContextProps>;
};

const renderConfigServiceTask = (props: Partial<RenderProps> = {}) => {
  const { bpmnContextProps, bpmnApiContextProps } = props;

  return render(
    <MemoryRouter>
      <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
        <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
          <BpmnConfigPanelFormContextProvider>
            <ConfigServiceTask />
          </BpmnConfigPanelFormContextProvider>
        </BpmnContext.Provider>
      </BpmnApiContext.Provider>
    </MemoryRouter>,
  );
};
