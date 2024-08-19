import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecommendedActionChangeName } from './RecommendedActionChangeName';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { useValidateBpmnTaskId } from '../../../../hooks/useValidateBpmnId';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { StudioRecommendedNextActionContextProvider } from '@studio/components';

jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: jest.fn(),
}));

jest.mock('../../../../hooks/useValidateBpmnId', () => ({
  useValidateBpmnTaskId: jest.fn(),
}));

jest.mock('../../../../utils/bpmnModeler/StudioModeler.ts', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateElementProperties: jest.fn(),
  })),
}));

describe('RecommendedActionChangeName', () => {
  const setBpmnDetails = jest.fn();
  const validateBpmnTaskId = jest.fn();
  const DEFAULT_ID = 'test_id';

  beforeEach(() => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { id: DEFAULT_ID, element: { id: 'test_id' }, metadata: {} },
      setBpmnDetails: setBpmnDetails,
      modelerRef: { current: { get: () => ({ updateProperties: jest.fn() }) } },
    });
    (useValidateBpmnTaskId as jest.Mock).mockReturnValue({
      validateBpmnTaskId: validateBpmnTaskId,
    });
    jest.clearAllMocks();
  });

  it('calls validation on name input', async () => {
    const user = userEvent.setup();
    renderWithContext(<RecommendedActionChangeName />);
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, 'newName');

    expect(validateBpmnTaskId).toHaveBeenCalledWith('newName');
  });

  it('calls saveNewName when save button is clicked with a valid name', async () => {
    const user = userEvent.setup();
    renderWithContext(<RecommendedActionChangeName />);
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, 'newName');

    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(setBpmnDetails).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'newName',
      }),
    );
  });

  it('calls cancelAction when skip button is clicked', async () => {
    const user = userEvent.setup();
    renderWithContext(<RecommendedActionChangeName />);

    const skipButton = screen.getByRole('button', { name: textMock('general.skip') });
    await user.click(skipButton);

    expect(setBpmnDetails).not.toHaveBeenCalled();
  });

  const renderWithContext = (children) => {
    render(
      <StudioRecommendedNextActionContextProvider>
        {children}
      </StudioRecommendedNextActionContextProvider>,
    );
  };
});
