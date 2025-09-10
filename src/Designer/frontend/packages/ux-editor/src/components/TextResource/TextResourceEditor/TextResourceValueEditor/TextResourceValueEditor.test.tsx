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
import { app, org } from '@studio/testing/testids';

const user = userEvent.setup();

// Test data:
const textResources: ITextResource[] = [
  { id: '1', value: 'Text 1' },
  { id: '2', value: 'Text 2' },
  { id: '3', value: 'Text 3' },
];

const textResourceId = textResources[0].id;
const mockOnTextChange = jest.fn();
const defaultProps: TextResourceValueEditorProps = {
  textResourceId,
  onTextChange: mockOnTextChange,
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

  it('Calls onTextChange when value is changed', async () => {
    renderTextResource({}, textResources);
    const textboxLabel = textMock('ux_editor.text_resource_binding_text');
    const textbox = screen.getByRole('textbox', { name: textboxLabel });
    await user.type(textbox, 'a');
    expect(mockOnTextChange).toHaveBeenCalled();
    const lastCall = mockOnTextChange.mock.calls[mockOnTextChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe(textResources[0].value + 'a');
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
