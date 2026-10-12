import { afterEach, describe, expect, it, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { TextResourceAction, type TextResourceActionProps } from './TextResourceAction';
import { renderWithProviders } from '../../../testing/mocks';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { TranslationKey } from '@altinn-studio/language/type';

const newText = 'New text';
const testId = 'test-id';

vi.mock('../../../hooks/mutations/useUpsertTextResourceMutation', () => ({
  useUpsertTextResourceMutation: () => ({ mutate: onSave }),
}));

describe('TextResourceAction', () => {
  const getSaveButton = () => screen.getByRole('button', { name: textMock('general.save') });
  const getCancelButton = () => screen.getByRole('button', { name: textMock('general.cancel') });
  const getDeleteButton = () => screen.getByRole('button', { name: textMock('general.delete') });
  const getTextbox = () => screen.getByRole('textbox');

  afterEach(() => vi.clearAllMocks());

  it('disables save button when text is unchanged or is empty', async () => {
    const user = userEvent.setup();
    renderTextResourceAction({}, [{ id: testId, value: 'Existing text' }]);
    expect(getSaveButton()).toBeDisabled();

    await user.type(getTextbox(), ' Some text');
    expect(getSaveButton()).toBeEnabled();

    await user.clear(getTextbox());
    expect(getSaveButton()).toBeDisabled();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    renderTextResourceAction({ handleIdChange: onSave });
    await user.type(getTextbox(), newText);

    await user.click(getSaveButton());
    expect(onSave).toHaveBeenCalledWith({ language: 'nb', textId: testId, translation: newText });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderTextResourceAction();
    await user.click(getCancelButton());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete and onCancel when delete is confirmed', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderTextResourceAction({}, [{ id: testId, value: 'Existing text' }]);
    await user.click(getDeleteButton());
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables delete button when textResourceId doesnt exists in the component', () => {
    renderTextResourceAction({ textResourceId: undefined });
    expect(getDeleteButton()).toBeDisabled();
  });
});

const onSave = vi.fn();
const onCancel = vi.fn();
const onDelete = vi.fn();

const defaultProps: TextResourceActionProps = {
  label: 'ux_editor.component_title' as TranslationKey,
  textResourceId: testId,
  handleIdChange: vi.fn(),
  setIsOpen: onCancel,
  handleRemoveTextResource: onDelete,
  disableSearch: false,
};

const renderTextResourceAction = (
  props: Partial<TextResourceActionProps> = {},
  resources: ITextResource[] = [],
) => {
  const queryClient = createQueryClientMock();
  const textResourcesList: ITextResources = {
    [DEFAULT_LANGUAGE]: resources,
  };
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResourcesList);

  return renderWithProviders(<TextResourceAction {...defaultProps} {...props} />, {
    queryClient,
  });
};
