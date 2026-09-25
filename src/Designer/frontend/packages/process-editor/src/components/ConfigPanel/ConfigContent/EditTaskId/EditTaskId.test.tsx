import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditTaskId } from './EditTaskId';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { mockModelerRef } from '../../../../../test/mocks/bpmnModelerMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';

const task1IdMock = 'task_1';
const setBpmnDetailsMock = jest.fn();
let mockLayoutSets: LayoutSets = [];
jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: () => ({
    modelerRef: mockModelerRef,
    setBpmnDetails: setBpmnDetailsMock,
    bpmnDetails: mockBpmnDetails,
  }),
}));

jest.mock('../../../../contexts/BpmnApiContext', () => ({
  useBpmnApiContext: () => ({ layoutSets: mockLayoutSets }),
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
    mockLayoutSets = [];
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

  describe('when the task has a layout set named after it', () => {
    const subformLayoutSetId = 'subformLayoutSet';
    const idLongerThanLayoutSetNameLimit = 'a'.repeat(29);

    beforeEach(() => {
      mockLayoutSets = [{ id: mockBpmnDetails.id }, { id: subformLayoutSetId, type: 'subform' }];
    });

    const layoutSetNameTests = [
      {
        description: 'is longer than a layout set name can be',
        inputValue: idLongerThanLayoutSetNameLimit,
        expectedError: 'validation_errors.name_invalid',
      },
      {
        description: 'is shorter than a layout set name can be',
        inputValue: 'a',
        expectedError:
          'process_editor.configuration_panel_custom_receipt_layout_set_name_validation',
      },
      {
        description: 'is the name of another layout set',
        inputValue: subformLayoutSetId,
        expectedError: 'process_editor.configuration_panel_layout_set_id_not_unique',
      },
    ];

    layoutSetNameTests.forEach(({ description, inputValue, expectedError }) => {
      it(`should display validation error and keep the task id when the new id ${description}`, async () => {
        const user = userEvent.setup();
        render(<EditTaskId />);

        await changeTaskId(user, inputValue);

        expect(await screen.findByText(textMock(expectedError))).toBeInTheDocument();
        expect(setBpmnDetailsMock).not.toHaveBeenCalled();
      });
    });

    it('should accept an id longer than a layout set name can be when the task has no layout set', async () => {
      mockLayoutSets = [{ id: subformLayoutSetId, type: 'subform' }];
      const user = userEvent.setup();
      render(<EditTaskId />);

      await changeTaskId(user, idLongerThanLayoutSetNameLimit);

      expect(setBpmnDetailsMock).toHaveBeenCalledTimes(1);
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

const changeTaskId = async (user: ReturnType<typeof userEvent.setup>, newId: string) => {
  await user.click(
    screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_change_task_id'),
    }),
  );
  const input = screen.getByLabelText(
    textMock('process_editor.configuration_panel_change_task_id'),
  );
  await user.clear(input);
  await user.type(input, newId);
  await user.tab();
};
