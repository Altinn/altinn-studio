import React from 'react';
import userEvent from '@testing-library/user-event';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { createQueryClientMock, queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { TextResourceValueEditorProps } from './TextResourceValueEditor';
import { TextResourceValueEditor } from './TextResourceValueEditor';
import { renderWithProviders } from '../../../../testing/mocks';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { typedLocalStorage } from '@studio/pure-functions';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { appContextMock } from '../../../../testing/appContextMock';
import { app, org } from '@studio/testing/testids';
import { emptyTextResourceListMock } from 'app-shared/mocks/emptyTextResourceListMock';

const user = userEvent.setup();

// Test data:
const textResources: ITextResource[] = [
  { id: '1', value: 'Text 1' },
  { id: '2', value: 'Text 2' },
  { id: '3', value: 'Text 3' },
];

const textResourceId = textResources[0].id;
const mockOnSetCurrentValue = jest.fn();
const defaultProps: TextResourceValueEditorProps = {
  textResourceId,
  onSetCurrentValue: mockOnSetCurrentValue,
};

describe('TextResourceValueEditor', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClientMock.clear();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('Displays textbox with given value', async () => {
    renderTextResource({}, textResources);

    const textboxLabel = textMock('ux_editor.text_resource_binding_text');

    const textbox = screen.getByRole('textbox', { name: textboxLabel });
    expect(textbox).toHaveValue(textResources[0].value);
  });

  it('Mutates text resource when value is changed', async () => {
    const upsertTextResources = jest
      .fn()
      .mockImplementation(() => Promise.resolve(emptyTextResourceListMock(DEFAULT_LANGUAGE)));
    renderTextResource({}, textResources, { upsertTextResources });

    const textboxLabel = textMock('ux_editor.text_resource_binding_text');
    const textbox = screen.getByRole('textbox', { name: textboxLabel });
    await user.type(textbox, 'a');
    await user.tab();

    expect(upsertTextResources).toHaveBeenCalledTimes(1);
    expect(upsertTextResources).toHaveBeenCalledWith(org, app, DEFAULT_LANGUAGE, {
      [textResourceId]: textResources[0].value + 'a',
    });

    expect(appContextMock.updateTextsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateTextsForPreview).toHaveBeenCalledWith(DEFAULT_LANGUAGE);
  });
});

const renderTextResource = (
  props: Partial<TextResourceValueEditorProps> = {},
  resources: ITextResource[] = [],
  queries: Partial<ServicesContextProps> = {},
) => {
  const queryClient = createQueryClientMock();
  const textResourcesList: ITextResources = {
    [DEFAULT_LANGUAGE]: resources,
  };
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResourcesList);

  return renderWithProviders(<TextResourceValueEditor {...defaultProps} {...props} />, {
    queryClient,
    queries,
  });
};
