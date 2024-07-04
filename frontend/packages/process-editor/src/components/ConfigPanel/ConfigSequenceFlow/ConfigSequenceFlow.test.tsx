import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfigSequenceFlow } from './ConfigSequenceFlow';
import { BpmnContext, type BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnApiContextProvider } from '../../../contexts/BpmnApiContext';
import { BpmnConfigPanelFormContextProvider } from '../../../contexts/BpmnConfigPanelContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import { BpmnExpressionModeler } from '../../../utils/bpmnModeler/BpmnExpressionModeler';

jest.mock('../../../utils/bpmnModeler/BpmnExpressionModeler');

describe('ConfigSequenceFlow', () => {
  afterEach(jest.clearAllMocks);

  it('should render title for sequence flow configuration', () => {
    renderConfigSequenceFlow({
      bpmnDetails: { ...mockBpmnDetails, element: {} },
    });

    expect(
      screen.getByText(textMock('process_editor.sequence_flow_configuration_panel_title')),
    ).toBeInTheDocument();
  });

  it('should hide add expression button', async () => {
    const user = userEvent.setup();

    renderConfigSequenceFlow({
      bpmnDetails: { ...mockBpmnDetails, element: {} },
    });

    const addNewExpressionButton = screen.getByRole('button', {
      name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
    });

    await user.click(addNewExpressionButton);
    expect(addNewExpressionButton).not.toBeInTheDocument();
  });

  it('should display expression editor after add expression button is clicked', async () => {
    const user = userEvent.setup();

    renderConfigSequenceFlow({
      bpmnDetails: { ...mockBpmnDetails, element: {} },
    });

    const addNewExpressionButton = screen.getByRole('button', {
      name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
    });

    await user.click(addNewExpressionButton);

    const simplifiedEditor = screen.getByRole('tab', {
      name: textMock('expression.simplified'),
    });
    expect(simplifiedEditor).toBeInTheDocument();
  });

  it('should save the default expression when add expression button is clicked', async () => {
    const user = userEvent.setup();

    const createExpressionElementMock = jest.fn();
    const addChildElementToParentMock = jest.fn();
    (BpmnExpressionModeler as jest.Mock).mockImplementation(() => ({
      createExpressionElement: createExpressionElementMock,
      addChildElementToParent: addChildElementToParentMock,
    }));

    renderConfigSequenceFlow({
      bpmnDetails: { ...mockBpmnDetails, element: {} },
    });

    const addNewExpressionButton = screen.getByRole('button', {
      name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
    });

    await user.click(addNewExpressionButton);

    expect(createExpressionElementMock).toHaveBeenCalledWith(
      JSON.stringify(['equals', ['gatewayAction'], 'reject']),
    );
    expect(addChildElementToParentMock).toHaveBeenCalledTimes(1);
  });

  it('should save the expression when the save button is clicked', async () => {
    const user = userEvent.setup();
    renderConfigSequenceFlow({
      bpmnDetails: { ...mockBpmnDetails, element: {} },
    });

    const addNewExpressionButton = screen.getByRole('button', {
      name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
    });

    await user.click(addNewExpressionButton);

    const editButton = screen.getByRole('button', {
      name: textMock('general.edit'),
    });

    await user.click(editButton);

    const saveButton = screen.getByRole('button', { name: textMock('expression.saveAndClose') });

    expect(saveButton).toBeInTheDocument();
    await user.click(saveButton);
  });

  it('should delete the expression when the delete button is clicked', async () => {
    window.confirm = jest.fn(() => true);

    const updateElementPropertiesMock = jest.fn();
    (BpmnExpressionModeler as jest.Mock).mockImplementation(() => ({
      updateElementProperties: updateElementPropertiesMock,
      createExpressionElement: jest.fn(),
      addChildElementToParent: jest.fn(),
    }));

    const user = userEvent.setup();

    renderConfigSequenceFlow({
      bpmnDetails: { ...mockBpmnDetails, element: {} },
    });

    const addNewExpressionButton = screen.getByRole('button', {
      name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
    });

    await user.click(addNewExpressionButton);

    const editButton = screen.getByRole('button', {
      name: textMock('general.edit'),
    });

    await user.click(editButton);

    const deleteButton = screen.getByRole('button', { name: textMock('general.delete') });
    await user.click(deleteButton);

    await waitFor(() => expect(updateElementPropertiesMock).toHaveBeenCalledTimes(1));
    expect(updateElementPropertiesMock).toHaveBeenCalledTimes(1);
  });
});

const renderConfigSequenceFlow = (rootContextProps: Partial<BpmnContextProps> = {}) => {
  return render(
    <BpmnContext.Provider value={{ ...rootContextProps }}>
      <BpmnApiContextProvider>
        <BpmnConfigPanelFormContextProvider>
          <ConfigSequenceFlow />
        </BpmnConfigPanelFormContextProvider>
      </BpmnApiContextProvider>
    </BpmnContext.Provider>,
  );
};
