import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditTaskId } from './EditTaskId';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { useBpmnConfigPanelFormContext } from '../../../../contexts/BpmnConfigPanelContext';
import {
  type BpmnApiContextProps,
  BpmnApiContextProvider,
} from '../../../../contexts/BpmnApiContext';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';

const mockBpmnApiContextValue: Partial<BpmnApiContextProps> = {
  layoutSets: {
    sets: [
      {
        id: 'testId',
        dataType: 'layoutSetId1',
        tasks: ['testId'],
      },
      {
        id: 'layoutSetId2',
        dataType: 'layoutSetId2',
        tasks: ['Task_2'],
      },
    ],
  },
};

const renderEditTaskId = (children: React.ReactNode) => {
  return render(
    <BpmnApiContextProvider {...mockBpmnApiContextValue}>{children}</BpmnApiContextProvider>,
  );
};

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
    bpmnDetails: mockBpmnDetails,
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
    renderEditTaskId(<EditTaskId />);

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_change_task_id'),
      }),
    ).toBeInTheDocument();
  });

  it('should render task id in edit mode when clicking on the edit button', async () => {
    const user = userEvent.setup();
    renderEditTaskId(<EditTaskId />);

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

    renderEditTaskId(<EditTaskId />);

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

    expect(metaDataFormRefMock.current).toEqual(
      expect.objectContaining({ taskIdChange: { newId: newId, oldId: 'testId' } }),
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
        inputValue: 'Task_2',
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
        renderEditTaskId(<EditTaskId />);

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

        expect(screen.getByText(textMock(expectedError, textArgs))).toBeInTheDocument();
      });
    });
  });

  it('should support HTMLDivElement props', () => {
    renderEditTaskId(<EditTaskId className='my-awesome-class-name' data-testid='unitTestId' />);
    expect(screen.getByTestId('unitTestId')).toHaveClass('my-awesome-class-name');
  });

  it('should not update id if new id is the same as the old id', async () => {
    const user = userEvent.setup();
    const metaDataFormRefMock = { current: undefined };
    (useBpmnConfigPanelFormContext as jest.Mock).mockReturnValue({
      metaDataFormRef: metaDataFormRefMock,
    });

    renderEditTaskId(<EditTaskId />);

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
