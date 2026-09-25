import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EditTaskName } from './EditTaskName';
import { BpmnContext } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';

const updateElementPropertiesMock = jest.fn();
const setBpmnDetailsMock = jest.fn();

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateElementProperties: updateElementPropertiesMock,
  })),
}));

const nameLabel = textMock('process_editor.configuration_panel_name_label');

describe('EditTaskName', () => {
  afterEach(jest.clearAllMocks);

  it('should write the new name to the bpmn element when the name is edited', async () => {
    const user = userEvent.setup();
    const newName = 'A better name';
    renderEditTaskName();

    await typeName(user, newName);

    expect(updateElementPropertiesMock).toHaveBeenCalledWith({ name: newName });
    expect(setBpmnDetailsMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: newName, id: mockBpmnDetails.id }),
    );
  });

  it('focuses the input so a name can be edited with the keyboard', async () => {
    const user = userEvent.setup();
    renderEditTaskName();

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('textbox', { name: nameLabel })).toHaveFocus();
    await user.keyboard('{Control>}a{/Control}Keyboard name{Tab}');
    expect(updateElementPropertiesMock).toHaveBeenCalledWith({ name: 'Keyboard name' });
  });

  it('should accept an empty name, since a bpmn name is optional', async () => {
    const user = userEvent.setup();
    renderEditTaskName();

    await typeName(user, '');

    expect(updateElementPropertiesMock).toHaveBeenCalledWith({ name: '' });
  });

  it('should not write anything when the name is unchanged', async () => {
    const user = userEvent.setup();
    renderEditTaskName();

    await typeName(user, mockBpmnDetails.name);

    expect(updateElementPropertiesMock).not.toHaveBeenCalled();
    expect(setBpmnDetailsMock).not.toHaveBeenCalled();
  });
});

const typeName = async (user: ReturnType<typeof userEvent.setup>, name: string): Promise<void> => {
  await user.click(screen.getByRole('button', { name: nameLabel }));
  const input = screen.getByLabelText(nameLabel);
  await user.clear(input);
  if (name !== '') await user.type(input, name);
  await user.tab();
};

const renderEditTaskName = () =>
  render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, setBpmnDetails: setBpmnDetailsMock }}>
      <EditTaskName />
    </BpmnContext.Provider>,
  );
