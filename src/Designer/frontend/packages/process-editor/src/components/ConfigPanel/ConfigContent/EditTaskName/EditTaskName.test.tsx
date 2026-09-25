import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EditTaskName } from './EditTaskName';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';

const nameLabel = textMock('process_editor.configuration_panel_name_label');

describe('EditTaskName', () => {
  afterEach(jest.clearAllMocks);

  it('should write the new name to the bpmn element when the name is edited', async () => {
    const user = userEvent.setup();
    const newName = 'A better name';
    const { modeling } = renderEditTaskName();

    await typeName(user, newName);

    expect(modeling.updateProperties).toHaveBeenCalledWith(expect.anything(), { name: newName });
    expect(screen.getByText(newName)).toBeInTheDocument();
  });

  it('focuses the input so a name can be edited with the keyboard', async () => {
    const user = userEvent.setup();
    const { modeling } = renderEditTaskName();

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('textbox', { name: nameLabel })).toHaveFocus();
    await user.keyboard('{Control>}a{/Control}Keyboard name{Tab}');
    expect(modeling.updateProperties).toHaveBeenCalledWith(expect.anything(), {
      name: 'Keyboard name',
    });
  });

  it('shows an external model change without another selection or explicit rerender', () => {
    const { businessObject, emitElementsChanged } = renderEditTaskName();
    act(() => {
      businessObject.set('name', 'Restored name');
      emitElementsChanged();
    });
    expect(screen.getByText('Restored name')).toBeInTheDocument();
  });

  it('should accept an empty name, since a bpmn name is optional', async () => {
    const user = userEvent.setup();
    const { modeling } = renderEditTaskName();

    await typeName(user, '');

    expect(modeling.updateProperties).toHaveBeenCalledWith(expect.anything(), { name: '' });
  });

  it('should not write anything when the name is unchanged', async () => {
    const user = userEvent.setup();
    const { modeling } = renderEditTaskName();

    await typeName(user, 'Original name');

    expect(modeling.updateProperties).not.toHaveBeenCalled();
  });
});

const typeName = async (user: ReturnType<typeof userEvent.setup>, name: string): Promise<void> => {
  await user.click(screen.getByRole('button', { name: nameLabel }));
  const input = screen.getByLabelText(nameLabel);
  await user.clear(input);
  if (name !== '') await user.type(input, name);
  await user.tab();
};

const renderEditTaskName = () => {
  const modeler = createBpmnTestModeler('bpmn:Task', { name: 'Original name' });
  render(<EditTaskName />, { wrapper: modeler.Wrapper });
  return modeler;
};
