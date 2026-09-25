import { render, screen } from '@testing-library/react';
import { EditLayoutSetName } from './EditLayoutSetName';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockBpmnApiContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import userEvent from '@testing-library/user-event';

const updateLayoutSetIdMock = jest.fn();
jest.mock('../../../../hooks/useUpdateLayoutSetId', () => ({
  useUpdateLayoutSetId: () => updateLayoutSetIdMock,
}));

const existingLayoutSetNameMock = 'existingLayoutSetName';

describe('EditLayoutSetName', () => {
  afterEach(jest.clearAllMocks);

  it('should render the layoutSetName button', () => {
    renderEditLayoutSetName();
    const editLayoutSetName = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_layout_set_name_label'),
    });
    expect(editLayoutSetName).toBeInTheDocument();
  });

  it('should render the name of the layoutSetName textfield using the connected taskId', () => {
    renderEditLayoutSetName();
    const layoutSetNameViewMode = screen.getByLabelText(
      textMock('process_editor.configuration_panel_layout_set_name_label'),
    );
    expect(layoutSetNameViewMode).toHaveTextContent(
      textMock('process_editor.configuration_panel_layout_set_name_label') +
        existingLayoutSetNameMock,
    );
  });

  it('should call updateLayoutSetId when changing name', async () => {
    const user = userEvent.setup();
    const newLayoutSetName = 'newLayoutSetName';
    renderEditLayoutSetName();
    const editLayoutSetName = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_layout_set_name_label'),
    });
    await user.click(editLayoutSetName);
    const inputNewLayoutSetName = screen.getByRole('textbox', {
      name: textMock('process_editor.configuration_panel_layout_set_name_label'),
    });
    await user.clear(inputNewLayoutSetName);
    await user.type(inputNewLayoutSetName, newLayoutSetName);
    await user.tab();
    expect(updateLayoutSetIdMock).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetIdMock).toHaveBeenCalledWith(existingLayoutSetNameMock, newLayoutSetName);
  });

  it('should not call updateLayoutSetId when changing name to original', async () => {
    const user = userEvent.setup();
    renderEditLayoutSetName();
    const editLayoutSetName = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_layout_set_name_label'),
    });
    await user.click(editLayoutSetName);
    const inputNewLayoutSetName = screen.getByRole('textbox', {
      name: textMock('process_editor.configuration_panel_layout_set_name_label'),
    });
    await user.clear(inputNewLayoutSetName);
    await user.type(inputNewLayoutSetName, existingLayoutSetNameMock);
    await user.tab();
    expect(updateLayoutSetIdMock).not.toHaveBeenCalled();
  });
});

const renderEditLayoutSetName = (
  bpmnApiContextValue: Partial<BpmnApiContextProps> = {},
  existingLayoutSetName = existingLayoutSetNameMock,
) => {
  render(
    <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextValue }}>
      <EditLayoutSetName existingLayoutSetName={existingLayoutSetName} />
    </BpmnApiContext.Provider>,
  );
};
