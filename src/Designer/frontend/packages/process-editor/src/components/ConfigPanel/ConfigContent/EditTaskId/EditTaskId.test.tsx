import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditTaskId } from './EditTaskId';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { mockModelerRef } from '../../../../../test/mocks/bpmnModelerMock';

const task1IdMock = 'task_1';
const setBpmnDetailsMock = jest.fn();
jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: () => ({
    modelerRef: mockModelerRef,
    setBpmnDetails: setBpmnDetailsMock,
    bpmnDetails: mockBpmnDetails,
  }),
}));

jest.mock('../../../../contexts/BpmnConfigPanelContext', () => ({
  useBpmnConfigPanelFormContext: jest.fn(),
}));

(useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
  metadataFormRef: { current: undefined },
});

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getAllTasksByType: jest
          .fn()
          .mockReturnValue([{ id: task1IdMock }, { id: 'task_2' }, { id: 'task_3' }]),
      };
    }),
  };
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

  it('should update metadataFromRef and updateId (implicitly calling setBpmnDetails) when changing task id', async () => {
    const user = userEvent.setup();
    const newId = 'newId';
    const metadataFormRefMock = { current: undefined };
    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      metadataFormRef: metadataFormRefMock,
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
    await user.type(input, newId);
    await user.tab();

    expect(metadataFormRefMock.current).toEqual(
      expect.objectContaining({ taskIdChange: { newId: newId, oldId: mockBpmnDetails.id } }),
    );
    expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
  });

  describe('validation', () => {
    const validationTests = [
      {
        description: 'is empty',
        inputValue: '',
        expectedError: 'validation_errors.required',
      },
      {
        description: 'is not unique',
        inputValue: task1IdMock,
        expectedError: 'process_editor.validation_error.id_not_unique',
      },
      {
        description: 'is not unique (case-insensitive)',
        inputValue: task1IdMock.toUpperCase(),
        expectedError: 'process_editor.validation_error.id_not_unique',
      },
      {
        description: 'is too long',
        inputValue: 'a'.repeat(51),
        expectedError: 'process_editor.validation_error.id_max_length',
        textArgs: { 0: 50 },
      },
      {
        description: 'contains spaces',
        inputValue: 'test Name',
        expectedError: 'process_editor.validation_error.no_spacing',
      },
      {
        description: 'contains invalid letters',
        inputValue: 'testNameÅ',
        expectedError: 'process_editor.validation_error.letters',
      },
      {
        description: 'contains invalid symbols',
        inputValue: 'testName@',
        expectedError: 'process_editor.validation_error.symbols',
      },
      {
        description: 'starts with reserved word',
        inputValue: 'CustomName',
        expectedError: 'process_editor.validation_error.id_reserved',
        textArgs: { 0: 'starte ID-en med Custom' },
      },
    ];

    validationTests.forEach(({ description, inputValue, expectedError, textArgs }) => {
      it(`should display validation error when task id ${description}`, async () => {
        const user = userEvent.setup();
        render(<EditTaskId />);

        const editButton = screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_change_task_id'),
        });
        await user.click(editButton);

        const input = screen.getByLabelText(
          textMock('process_editor.configuration_panel_change_task_id'),
        );

        await user.clear(input);
        if (inputValue !== '') await user.type(input, inputValue);
        await user.tab();

        const errorMessage = await screen.findByText(textMock(expectedError, textArgs));
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  it('should not update id if new id is the same as the old id', async () => {
    const user = userEvent.setup();
    const metadataFormRefMock = { current: undefined };
    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      metadataFormRef: metadataFormRefMock,
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
    await user.type(input, mockBpmnDetails.id);
    await user.tab();

    expect(metadataFormRefMock.current).toBeUndefined();
    expect(setBpmnDetailsMock).not.toHaveBeenCalled();
  });
});
