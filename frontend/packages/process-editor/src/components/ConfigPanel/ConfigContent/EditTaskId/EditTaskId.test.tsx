import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditTaskId } from './EditTaskId';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';

const setBpmnDetailsMock = jest.fn();
jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: () => ({
    modelerRef: {
      current: {
        get: () => ({
          updateProperties: jest.fn(),
        }),
      },
    },
    setBpmnDetails: setBpmnDetailsMock,
    bpmnDetails: {
      id: 'testId',
      name: 'testName',
      taskType: 'data',
      type: 'task',
    },
  }),
}));

jest.mock('../../../../contexts/BpmnConfigPanelContext', () => ({
  useBpmnConfigPanelFormContext: jest.fn(),
}));

(useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
  metaDataFormRef: { current: undefined },
});

describe('EditTaskId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render task id as view mode by default', () => {
    render(<EditTaskId />);

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_task_id'),
      }),
    ).toBeInTheDocument();
  });

  it('should render task id in edit mode when clicking on the edit button', async () => {
    const user = userEvent.setup();
    render(<EditTaskId />);

    const editButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    await user.click(editButton);

    expect(
      screen.getByLabelText(textMock('process_editor.configuration_panel_change_task_id')),
    ).toBeInTheDocument();
  });

  it('should update metaDataFromRef and updateId (implicitly calling setBpmnDetails) when changing task id', async () => {
    const user = userEvent.setup();
    const newId = 'newId';
    const metaDataFormRefMock = { current: undefined };
    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      metaDataFormRef: metaDataFormRefMock,
    });

    render(<EditTaskId />);

    const editButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    await user.click(editButton);

    const input = screen.getByLabelText(
      textMock('process_editor.configuration_panel_change_task_id'),
    );

    await act(() => user.clear(input));
    await act(() => user.type(input, newId));
    await act(() => user.tab());

    expect(metaDataFormRefMock.current).toEqual(
      expect.objectContaining({ taskIdChanges: [{ newId: newId, oldId: 'testId' }] }),
    );
    expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
  });

  it('should display validation error when task id is empty', async () => {
    const user = userEvent.setup();
    render(<EditTaskId />);

    const editButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    await user.click(editButton);

    const input = screen.getByLabelText(
      textMock('process_editor.configuration_panel_change_task_id'),
    );

    await act(() => user.clear(input));
    await act(() => user.tab());

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('should support HTMLDivElement props', () => {
    render(<EditTaskId className='my-awesome-class-name' data-testid='unitTestId' />);
    expect(screen.getByTestId('unitTestId')).toHaveClass('my-awesome-class-name');
  });

  it('should not update id if new id is the same as the old id', async () => {
    const user = userEvent.setup();
    const metaDataFormRefMock = { current: undefined };
    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      metaDataFormRef: metaDataFormRefMock,
    });

    render(<EditTaskId />);

    const editButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    await user.click(editButton);

    const input = screen.getByLabelText(
      textMock('process_editor.configuration_panel_change_task_id'),
    );

    await user.clear(input);
    await user.type(input, 'testId');
    await user.tab();

    expect(metaDataFormRefMock.current).toBeUndefined();
    expect(setBpmnDetailsMock).not.toHaveBeenCalled();
  });
});
