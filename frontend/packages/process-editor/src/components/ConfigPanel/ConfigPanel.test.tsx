import React from 'react';
import { ConfigPanel } from './ConfigPanel';
import { render as rtlRender, screen } from '@testing-library/react';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { BpmnContextProvider } from '../../contexts/BpmnContext';
import { BpmnDetails } from '../../types/BpmnDetails';
import { BpmnTypeEnum } from '../../enum/BpmnTypeEnum';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;
const mockAppLibVersion8: string = '8.0.3';
const mockAppLibVersion7: string = '7.0.3';

const mockId: string = 'testId';
const mockName: string = 'testName';

const mockBpmnDetails: BpmnDetails = {
  id: mockId,
  name: mockName,
  taskType: 'data',
  type: BpmnTypeEnum.Task,
};

describe('ConfigPanel', () => {
  afterEach(jest.clearAllMocks);

  it('should render without crashing', () => {
    render('1.0.0');
    expect(
      screen.getByRole('heading', { name: textMock('process_editor.configuration_panel_heading') }),
    ).toBeInTheDocument();
  });

  it('should display the message about selecting a task when no task is selected', () => {});

  it('should the details about the task when ', () => {
    jest.mock('../../contexts/BpmnContext', () => ({
      bpmnDetails: mockBpmnDetails,
    }));

    render(mockAppLibVersion8);

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_data_task'),
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  const render = (appLibVersion?: string) => {
    return rtlRender(
      <BpmnContextProvider
        bpmnXml={mockBPMNXML}
        appLibVersion={appLibVersion || mockAppLibVersion7}
      >
        <ConfigPanel />
      </BpmnContextProvider>,
    );
  };
});
