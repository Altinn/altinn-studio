import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigSequenceFlow } from './ConfigSequenceFlow';
import { createBpmnTestModeler } from '../../../../test/createBpmnTestModeler';

describe('ConfigSequenceFlow', () => {
  afterEach(jest.restoreAllMocks);

  it('adds and removes a condition in the BPMN', async () => {
    const user = userEvent.setup();
    const { flow, moddle } = renderConfigSequenceFlow();
    await user.click(getAddRuleButton());

    expect(JSON.parse(flow.businessObject.conditionExpression.body)).toEqual([
      'equals',
      ['gatewayAction'],
      'reject',
    ]);
    expect((await moddle.toXML(flow.businessObject)).xml).toContain('bpmn:conditionExpression');

    jest.spyOn(window, 'confirm').mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: textMock('general.edit') }));
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(flow.businessObject.conditionExpression).toBeUndefined();
    expect(getAddRuleButton()).toBeInTheDocument();
  });

  it('preserves custom action names and saves manual edits without renaming the flow', async () => {
    const user = userEvent.setup();
    const body = '["equals",["gatewayAction"],"archiveConfirmed"]';
    const { flow } = renderConfigSequenceFlow(body);
    await user.click(screen.getByRole('tab', { name: textMock('expression.manual') }));
    const input = screen.getByRole('textbox', { name: textMock('expression') });
    expect(JSON.parse((input as HTMLTextAreaElement).value)).toEqual(JSON.parse(body));
    expect(flow.businessObject.conditionExpression.body).toBe(body);

    await user.clear(input);
    const edited = '["equals",["gatewayAction"],"anotherAction"]';
    await user.paste(edited);
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    expect(JSON.parse(flow.businessObject.conditionExpression.body)).toEqual(JSON.parse(edited));
    expect(flow.businessObject.name).toBe('Existing branch name');
  });

  it('refreshes the expression after a model change such as undo', async () => {
    const user = userEvent.setup();
    const { flow, notifyChange } = renderConfigSequenceFlow(
      '["equals",["gatewayAction"],"reject"]',
    );
    await user.click(screen.getByRole('tab', { name: textMock('expression.manual') }));
    const restored = '["notEquals",["gatewayAction"],"reject"]';
    act(() => {
      flow.businessObject.conditionExpression.body = restored;
      notifyChange();
    });
    expect(JSON.parse((screen.getByRole('textbox') as HTMLTextAreaElement).value)).toEqual(
      JSON.parse(restored),
    );
  });

  it('displays malformed JSON without discarding or replacing it', () => {
    const body = '["equals",';
    const { flow } = renderConfigSequenceFlow(body);
    expect(screen.getByRole('textbox')).toHaveValue(body);
    expect(screen.getByText(textMock('expression.invalidExpression'))).toBeInTheDocument();
    expect(flow.businessObject.conditionExpression.body).toBe(body);
  });

  it('preserves false as a flow condition', () => {
    const { flow } = renderConfigSequenceFlow('false');
    expect(
      screen.queryByRole('button', {
        name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
      }),
    ).not.toBeInTheDocument();
    expect(flow.businessObject.conditionExpression.body).toBe('false');
  });
});

function getAddRuleButton() {
  return screen.getByRole('button', {
    name: textMock('process_editor.sequence_flow_configuration_add_new_rule'),
  });
}

function renderConfigSequenceFlow(body?: string) {
  const modeler = createBpmnTestModeler('bpmn:SequenceFlow', {
    id: 'Flow_1',
    name: 'Existing branch name',
  });
  if (body !== undefined) {
    modeler.businessObject.conditionExpression = modeler.moddle.create('bpmn:FormalExpression', {
      body,
    });
  }
  render(<ConfigSequenceFlow />, { wrapper: modeler.Wrapper });
  return {
    flow: modeler.element,
    moddle: modeler.moddle,
    notifyChange: modeler.emitElementsChanged,
  };
}
