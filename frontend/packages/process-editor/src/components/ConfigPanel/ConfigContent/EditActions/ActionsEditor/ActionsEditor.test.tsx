import { render } from '@testing-library/react';
import { BpmnContext } from '@altinn/process-editor/contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../../test/mocks/bpmnContextMock';
import { BpmnConfigPanelFormContextProvider } from '@altinn/process-editor/contexts/BpmnConfigPanelContext';
import { PredefinedActions } from '@altinn/process-editor/components/ConfigPanel/ConfigContent/EditActions/ActionsEditor/PredefinedActions';
import React from 'react';

describe('ActionsEditor', () => {
  it('should be possible to add new action', () => {
    re;
  });
});

const renderActionsEditor = () => {
  return render(
    <BpmnContext.Provider value={mockBpmnContextValue}>
      <BpmnConfigPanelFormContextProvider>
        <PredefinedActions actionElement={actionElementMock} />
      </BpmnConfigPanelFormContextProvider>
    </BpmnContext.Provider>,
  );
};
