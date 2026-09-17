import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigContentContainer } from './ConfigContentContainer';
import { BpmnContext, type BpmnContextProps } from '../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import type { BpmnTaskType } from '../../../types/BpmnTaskType';

describe('ConfigContentContainer', () => {
  afterEach(jest.clearAllMocks);

  it('renders the heading for a built in task type', () => {
    renderConfigContentContainer('data');

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_data_task'),
      }),
    ).toBeInTheDocument();
  });

  it.each(['', 'myServiceTask'])('renders a heading for the custom task type "%s"', (taskType) => {
    renderConfigContentContainer(taskType);

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_custom_service_task'),
      }),
    ).toBeInTheDocument();
  });

  it('renders a heading for an element with no task type at all', () => {
    renderConfigContentContainer(null);

    expect(
      screen.getByRole('heading', {
        name: textMock('process_editor.configuration_panel_missing_task'),
      }),
    ).toBeInTheDocument();
  });
});

const renderConfigContentContainer = (taskType: BpmnTaskType | null) => {
  const bpmnContextProps: Partial<BpmnContextProps> = {
    bpmnDetails: { ...mockBpmnDetails, taskType },
  };

  return render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
      <ConfigContentContainer>{null}</ConfigContentContainer>
    </BpmnContext.Provider>,
  );
};
