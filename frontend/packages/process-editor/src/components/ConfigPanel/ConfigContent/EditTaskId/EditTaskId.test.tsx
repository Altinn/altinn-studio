import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditTaskId } from './EditTaskId';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';

jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: () => ({
    modelerRef: {
      current: '<div></div>',
    },
    setBpmnDetails: jest.fn(),
    bpmnDetails: {
      id: 'testId',
      name: 'testName',
      taskType: 'data',
      type: 'task',
    },
  }),
}));

jest.mock('../../../../hooks/useBpmnModeler', () => ({
  useBpmnModeler: () => ({
    getModeler: () => ({
      get: () => ({
        updateProperties: jest.fn(),
      }),
    }),
  }),
}));

jest.mock('../../../../contexts/BpmnConfigPanelContext', () => ({
  useBpmnConfigPanelFormContext: jest.fn(),
}));

describe('EditTaskId', () => {
  it('should render task id as view mode', () => {
    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      setMetaDataForm: jest.fn(),
    });
    render(<EditTaskId />);

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_task_id'),
      }),
    ).toBeInTheDocument();
  });

  it('should render edit mode when clicking on the edit button', async () => {
    const user = userEvent.setup();

    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      setMetaDataForm: jest.fn(),
    });
    render(<EditTaskId />);

    const editButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    await act(() => user.click(editButton));

    expect(
      screen.getByLabelText(textMock('process_editor.configuration_panel_change_task_id')),
    ).toBeInTheDocument();
  });

  it('should invoke setMetaDataForm and updateId when changing task id', async () => {
    const user = userEvent.setup();
    const mockedSetMetaDataForm = jest.fn();

    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      setMetaDataForm: mockedSetMetaDataForm,
    });

    render(<EditTaskId />);

    const editButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    await act(() => user.click(editButton));

    const input = screen.getByLabelText(
      textMock('process_editor.configuration_panel_change_task_id'),
    );

    await act(() => user.click(input));
    await act(() => user.type(input, 'newId'));
    await act(() => user.tab());

    expect(mockedSetMetaDataForm).toHaveBeenCalledTimes(1);
  });

  it('should display validation error when task id is empty', async () => {
    const user = userEvent.setup();

    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      setMetaDataForm: jest.fn(),
    });
    render(<EditTaskId />);

    const editButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    await act(() => user.click(editButton));

    const input = screen.getByLabelText(
      textMock('process_editor.configuration_panel_change_task_id'),
    );

    await act(() => user.click(input));
    await act(() => user.clear(input));
    await act(() => user.tab());

    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('should support HTMLDivElement props', () => {
    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      setMetaDataForm: jest.fn(),
    });
    render(<EditTaskId className='my-awesome-class-name' data-testid='unitTestId' />);
    expect(screen.getByTestId('unitTestId')).toHaveClass('my-awesome-class-name');
  });

  it('should not update id if new id is the same as the old id', async () => {
    const user = userEvent.setup();
    const mockedSetMetaDataForm = jest.fn();

    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      setMetaDataForm: mockedSetMetaDataForm,
    });

    render(<EditTaskId />);

    const editButton = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    });
    await act(() => user.click(editButton));

    const input = screen.getByLabelText(
      textMock('process_editor.configuration_panel_change_task_id'),
    );

    await act(() => user.clear(input));
    await act(() => user.type(input, 'testId'));
    await act(() => user.tab());

    expect(mockedSetMetaDataForm).toHaveBeenCalledTimes(0);
  });
});
