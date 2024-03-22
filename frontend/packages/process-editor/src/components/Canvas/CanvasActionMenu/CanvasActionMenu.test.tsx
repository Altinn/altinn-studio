import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CanvasActionMenuProps } from './CanvasActionMenu';
import { CanvasActionMenu } from './CanvasActionMenu';
import { textMock } from '../../../../../../testing/mocks/i18nMock';
import type { BpmnContextProps } from '../../../contexts/BpmnContext';
import { BpmnContext } from '../../../contexts/BpmnContext';

const mockBPMNXML: string = `<?xml version="1.0" encoding="UTF-8"?></xml>`;

const mockAppLibVersion8: string = '8.0.0';

const mockOnSave = jest.fn();

const defaultProps: CanvasActionMenuProps = {
  onSave: mockOnSave,
};

const defaultContextProps: BpmnContextProps = {
  bpmnXml: mockBPMNXML,
  modelerRef: null,
  numberOfUnsavedChanges: 0,
  setNumberOfUnsavedChanges: () => {},
  dataTasksAdded: [],
  setDataTasksAdded: () => {},
  dataTasksRemoved: [],
  setDataTasksRemoved: () => {},
  getUpdatedXml: async () => '',
  isEditAllowed: true,
  appLibVersion: mockAppLibVersion8,
  bpmnDetails: null,
  setBpmnDetails: () => {},
};

describe('CanvasActionMenu', () => {
  afterEach(jest.clearAllMocks);

  it('hides the save button when saving is not permitted', async () => {
    const user = userEvent.setup();
    renderCanvasActionMenu({ isEditAllowed: false });

    // Fix to remove act error
    await act(() => user.tab());

    const editButton = screen.queryByRole('button', { name: textMock('process_editor.save') });
    expect(editButton).not.toBeInTheDocument();
  });

  it('calls "onSave" when the user is in edit mode and clicks save button', async () => {
    const user = userEvent.setup();
    const onSave = jest.fn();
    renderCanvasActionMenu({ numberOfUnsavedChanges: 1 }, { onSave });

    const editButton = screen.getByRole('button', { name: textMock('process_editor.save') });
    await act(() => user.click(editButton));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('disables the save button if number of unsaved changes is 0', () => {
    renderCanvasActionMenu();
    const editButton = screen.getByRole('button', { name: textMock('process_editor.save') });
    expect(editButton).toBeDisabled();
  });
});

const renderCanvasActionMenu = (
  contextProps?: Partial<BpmnContextProps>,
  props?: Partial<CanvasActionMenuProps>,
) => {
  return render(
    <BpmnContext.Provider value={{ ...defaultContextProps, ...contextProps }}>
      <CanvasActionMenu {...defaultProps} {...props} />
    </BpmnContext.Provider>,
  );
};
