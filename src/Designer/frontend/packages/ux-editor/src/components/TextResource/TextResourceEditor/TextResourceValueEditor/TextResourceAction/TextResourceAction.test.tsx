import React from 'react';
import userEvent from '@testing-library/user-event';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { TextResourceAction, type TextResourceActionProps } from './TextResourceAction';
import { renderWithProviders } from '../../../../../testing/mocks';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { TranslationKey } from '@altinn-studio/language/type';

const newText = 'New text';
const testId = 'test-id';
const initialText = 'Initial text';
const modifiedText = 'Modified text';

describe('TextResourceAction', () => {
  const getSaveButton = () => screen.getByRole('button', { name: textMock('general.save') });
  const getCancelButton = () => screen.getByRole('button', { name: textMock('general.cancel') });
  const getDeleteButton = () => screen.getByRole('button', { name: textMock('general.delete') });
  const getTextbox = () => screen.getByRole('textbox');

  afterEach(() => jest.clearAllMocks());

  it('disables save button when empty, enables it when text is entered', async () => {
    const user = userEvent.setup();
    renderTextResourceAction();
    expect(getSaveButton()).toBeDisabled();
    await user.type(getTextbox(), 'Some text');
    expect(getSaveButton()).toBeEnabled();
  });

  it('calls onSave when save button is clicked', async () => {
    const user = userEvent.setup();
    renderTextResourceAction();
    await user.type(getTextbox(), newText);
    await user.click(getSaveButton());
    expect(onSave).toHaveBeenCalledWith(testId, newText);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderTextResourceAction();
    await user.click(getCancelButton());
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete and onCancel when delete is confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderTextResourceAction({}, [{ id: testId, value: 'Existing text' }]);
    await user.click(getDeleteButton());
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables delete button when no saved text exists', () => {
    renderTextResourceAction();
    expect(getDeleteButton()).toBeDisabled();
  });

  it('resets text to initial value when cancel is clicked', async () => {
    const user = userEvent.setup();
    renderTextResourceAction({}, [{ id: testId, value: initialText }]);
    await user.clear(getTextbox());
    await user.type(getTextbox(), modifiedText);
    expect(getTextbox()).toHaveValue(modifiedText);
    await user.click(getCancelButton());
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(getTextbox()).toHaveValue(initialText);
  });
});

const onSave = jest.fn();
const onCancel = jest.fn();
const onDelete = jest.fn();
const onReferenceChange = jest.fn();

const defaultProps: TextResourceActionProps = {
  legend: 'ux_editor.component_title' as TranslationKey,
  textResourceId: testId,
  onSave,
  onCancel,
  onDelete,
  onReferenceChange,
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
