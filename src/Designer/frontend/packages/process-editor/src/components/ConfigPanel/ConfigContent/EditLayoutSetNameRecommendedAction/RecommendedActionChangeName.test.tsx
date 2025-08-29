import React from 'react';
import { render, screen } from '@testing-library/react';
import { RecommendedActionChangeName } from './RecommendedActionChangeName';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { StudioRecommendedNextActionContext } from '@studio/components-legacy';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import { mockBpmnApiContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';

jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: jest.fn(),
}));

jest.mock('app-shared/hooks/useValidateLayoutSetName', () => ({
  useValidateLayoutSetName: jest.fn(),
}));

const removeActionMock = jest.fn();
const validateLayoutSetNameMock = jest.fn();

describe('RecommendedActionChangeName', () => {
  const DEFAULT_ID = 'test_id';

  beforeEach(() => {
    (useBpmnContext as jest.Mock).mockReturnValue({
      bpmnDetails: { id: DEFAULT_ID, element: { id: 'test_id' }, metadata: {} },
    });
    (useValidateLayoutSetName as jest.Mock).mockReturnValue({
      validateLayoutSetName: validateLayoutSetNameMock,
    });
    jest.clearAllMocks();
  });

  it('calls validation on name input', async () => {
    const user = userEvent.setup();
    const newLayoutSetName = 'newName';
    const mutateLayoutSetIdMock = jest.fn();
    renderRecommendedActionChangeName({ mutateLayoutSetId: mutateLayoutSetIdMock });
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, newLayoutSetName);

    expect(validateLayoutSetNameMock).toHaveBeenCalledTimes(newLayoutSetName.length);
    expect(validateLayoutSetNameMock).toHaveBeenCalledWith(newLayoutSetName, expect.any(Object));
  });

  it('calls mutateLayoutSetId and removeAction when save button is clicked with a valid name', async () => {
    const user = userEvent.setup();
    const newLayoutSetName = 'newName';
    const mutateLayoutSetIdMock = jest.fn();
    renderRecommendedActionChangeName({ mutateLayoutSetId: mutateLayoutSetIdMock });
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, newLayoutSetName);
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(mutateLayoutSetIdMock).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSetIdMock).toHaveBeenCalledWith({
      layoutSetIdToUpdate: DEFAULT_ID,
      newLayoutSetId: newLayoutSetName,
    });
    expect(removeActionMock).toHaveBeenCalledTimes(1);
  });

  it('calls mutateLayoutSetId and removeAction when pressing enter in input field', async () => {
    const user = userEvent.setup();
    const newLayoutSetName = 'newName';
    const mutateLayoutSetIdMock = jest.fn();
    renderRecommendedActionChangeName({ mutateLayoutSetId: mutateLayoutSetIdMock });
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, `${newLayoutSetName}{enter}`);
    expect(mutateLayoutSetIdMock).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSetIdMock).toHaveBeenCalledWith({
      layoutSetIdToUpdate: DEFAULT_ID,
      newLayoutSetId: newLayoutSetName,
    });
    expect(removeActionMock).toHaveBeenCalledTimes(1);
  });

  it('calls removeAction, but not mutateLayoutSetId, when skip button is clicked', async () => {
    const user = userEvent.setup();
    const mutateLayoutSetIdMock = jest.fn();
    renderRecommendedActionChangeName({ mutateLayoutSetId: mutateLayoutSetIdMock });

    const skipButton = screen.getByRole('button', { name: textMock('general.skip') });
    await user.click(skipButton);

    expect(mutateLayoutSetIdMock).not.toHaveBeenCalled();
    expect(removeActionMock).toHaveBeenCalledTimes(1);
  });

  const renderRecommendedActionChangeName = (
    bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
  ) => {
    render(
      <BpmnApiContext.Provider value={{ ...mockBpmnApiContextValue, ...bpmnApiContextProps }}>
        <StudioRecommendedNextActionContext.Provider
          value={{
            removeAction: removeActionMock,
            shouldDisplayAction: jest.fn(),
            addAction: jest.fn(),
          }}
        >
          <RecommendedActionChangeName />
        </StudioRecommendedNextActionContext.Provider>
      </BpmnApiContext.Provider>,
    );
  };
});
