import React from 'react';
import { render, screen } from '@testing-library/react';
import { NewNameRecommendation } from './NewNameRecommendation';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useValidateBpmnTaskId } from '../../../../hooks/useValidateBpmnId';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { useStudioRecommendedNextActionContext } from '@studio/components';

jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: jest.fn(),
}));

jest.mock('../../../../hooks/useValidateBpmnId', () => ({
  useValidateBpmnTaskId: jest.fn(),
}));

jest.mock(
  '@studio/components/src/components/StudioRecommendedNextAction/context/useStudioRecommendedNextActionContext.ts',
  () => ({
    useStudioRecommendedNextActionContext: jest.fn(),
  }),
);

describe('NewNameRecommendation', () => {
  const user = userEvent.setup();
  const setBpmnDetails = jest.fn();
  const validateBpmnTaskId = jest.fn();
  const DEFAULT_ID = 'test_id';

  beforeEach(() => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { id: DEFAULT_ID, element: {}, metadata: {} },
      setBpmnDetails: setBpmnDetails,
      modelerRef: { current: { get: () => ({ updateProperties: jest.fn() }) } },
    });
    (useStudioRecommendedNextActionContext as jest.Mock).mockReturnValue({
      removeAction: jest.fn(),
      addAction: jest.fn(),
      shouldDisplayAction: jest.fn(),
    });
    (useValidateBpmnTaskId as jest.Mock).mockReturnValue({
      validateBpmnTaskId: validateBpmnTaskId,
    });

    jest.clearAllMocks();
  });

  it('calls validation on name input', async () => {
    render(<NewNameRecommendation />);
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, 'newName');

    expect(validateBpmnTaskId).toHaveBeenCalledWith('newName');
  });

  it('calls saveNewName when save button is clicked with a valid name', async () => {
    render(<NewNameRecommendation />);
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, 'newName');

    const saveButton = screen.getByText(textMock('general.save'));
    await user.click(saveButton);

    expect(setBpmnDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'newName',
      }),
    );
  });

  it('calls cancelAction when skip button is clicked', async () => {
    render(<NewNameRecommendation />);

    const skipButton = screen.getByText(textMock('general.skip'));
    await user.click(skipButton);

    expect(setBpmnDetails).not.toHaveBeenCalled();
  });
});
