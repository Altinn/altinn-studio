import { render, screen } from '@testing-library/react';
import React from 'react';
import { EditLayoutSetName } from './EditLayoutSetName';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { mockBpmnApiContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import userEvent from '@testing-library/user-event';

const existingLayoutSetNameMock = 'existingLayoutSetName';

describe('EditLayoutSetName', () => {
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

  it('should call mutateLayoutSet when changing name', async () => {
    const user = userEvent.setup();
    const newLayoutSetName = 'newLayoutSetName';
    const mutateLayoutSetIdMock = jest.fn();
    renderEditLayoutSetName({ mutateLayoutSetId: mutateLayoutSetIdMock });
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
    expect(mutateLayoutSetIdMock).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSetIdMock).toHaveBeenCalledWith({
      layoutSetIdToUpdate: existingLayoutSetNameMock,
      newLayoutSetId: newLayoutSetName,
    });
  });

  it('should not call mutateLayoutSet when changing name to original', async () => {
    const user = userEvent.setup();
    const mutateLayoutSetIdMock = jest.fn();
    renderEditLayoutSetName({ mutateLayoutSetId: mutateLayoutSetIdMock });
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
    expect(mutateLayoutSetIdMock).not.toHaveBeenCalled();
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
