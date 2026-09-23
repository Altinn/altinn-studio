import { render, screen } from '@testing-library/react';
import { RecommendedActionChangeName } from './RecommendedActionChangeName';
import { useBpmnContext } from '../../../../contexts/BpmnContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { StudioRecommendedNextActionContext } from '@studio/components';
import { BpmnApiContext, type BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import { mockBpmnApiContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { useValidateLayoutSetName } from 'app-shared/hooks/useValidateLayoutSetName';

jest.mock('../../../../contexts/BpmnContext', () => ({
  useBpmnContext: jest.fn(),
}));

jest.mock('app-shared/hooks/useValidateLayoutSetName', () => ({
  useValidateLayoutSetName: jest.fn(),
}));

const updateLayoutSetIdMock = jest.fn();
jest.mock('../../../../hooks/useUpdateLayoutSetId', () => ({
  useUpdateLayoutSetId: () => updateLayoutSetIdMock,
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
    renderRecommendedActionChangeName();
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, newLayoutSetName);

    expect(validateLayoutSetNameMock).toHaveBeenCalledTimes(newLayoutSetName.length);
    expect(validateLayoutSetNameMock).toHaveBeenCalledWith(newLayoutSetName, expect.any(Object));
  });

  it('calls updateLayoutSetId and removeAction when save button is clicked with a valid name', async () => {
    const user = userEvent.setup();
    const newLayoutSetName = 'newName';
    renderRecommendedActionChangeName();
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, newLayoutSetName);
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    await user.click(saveButton);

    expect(updateLayoutSetIdMock).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetIdMock).toHaveBeenCalledWith(DEFAULT_ID, newLayoutSetName);
    expect(removeActionMock).toHaveBeenCalledTimes(1);
  });

  it('calls updateLayoutSetId and removeAction when pressing enter in input field', async () => {
    const user = userEvent.setup();
    const newLayoutSetName = 'newName';
    renderRecommendedActionChangeName();
    const newNameInput = screen.getByRole('textbox', {
      name: textMock('process_editor.recommended_action.new_name_label'),
    });
    await user.type(newNameInput, `${newLayoutSetName}{enter}`);
    expect(updateLayoutSetIdMock).toHaveBeenCalledTimes(1);
    expect(updateLayoutSetIdMock).toHaveBeenCalledWith(DEFAULT_ID, newLayoutSetName);
    expect(removeActionMock).toHaveBeenCalledTimes(1);
  });

  it('calls removeAction, but not updateLayoutSetId, when skip button is clicked', async () => {
    const user = userEvent.setup();
    renderRecommendedActionChangeName();

    const skipButton = screen.getByRole('button', { name: textMock('general.skip') });
    await user.click(skipButton);

    expect(updateLayoutSetIdMock).not.toHaveBeenCalled();
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
