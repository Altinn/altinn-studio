import type { RefObject } from 'react';
import React, { createRef } from 'react';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type { ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import type { ITextResources, ITextResourcesWithLanguage } from 'app-shared/types/global';
import userEvent from '@testing-library/user-event';
import { TextResourceEdit } from './TextResourceEdit';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderHookWithMockStore, renderWithMockStore, textLanguagesMock } from '../testing/mocks';
import { appDataMock, textResourcesMock } from '../testing/stateMocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { appContextMock } from '../testing/appContextMock';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const legendText = 'Rediger tekst';
const descriptionText = 'Tekstens ID: {{id}}';
const nbText = 'Bokmål';
const nnText = 'Nynorsk';
const enText = 'Engelsk';
const closeText = 'Lukk';
const texts = {
  'general.close': closeText,
  'language.nb': nbText,
  'language.nn': nnText,
  'language.en': enText,
  'ux_editor.edit_text_resource': legendText,
  'ux_editor.field_id': descriptionText,
};

// Mocks:
jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation(texts) }));

describe('TextResourceEdit', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClientMock.clear();
  });

  it('Does not render anything if edit id is undefined', async () => {
    await render();
    expect(screen.queryByText(legendText)).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: closeText })).not.toBeInTheDocument();
  });

  it('Renders correctly when a valid edit id is given', async () => {
    const id = 'some-id';
    const valueNb = 'Norge';
    const valueNn = 'Noreg';
    const valueEn = 'Norway';
    const resources: ITextResources = {
      nb: [{ id, value: valueNb }],
      nn: [{ id, value: valueNn }],
      en: [{ id, value: valueEn }],
    };
    await render(resources, id);
    expect(screen.getByText(legendText)).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect(screen.getByLabelText(nbText)).toHaveValue(valueNb);
    expect(screen.getByLabelText(nnText)).toHaveValue(valueNn);
    expect(screen.getByLabelText(enText)).toHaveValue(valueEn);
    expect(screen.getByRole('button', { name: closeText })).toBeInTheDocument();
  });

  it('Calls upsertTextResources with correct parameters when a text is changed', async () => {
    const id = 'some-id';
    const value = 'Lorem';
    const additionalValue = ' ipsum';
    const resources: ITextResources = { nb: [{ id, value }] };
    await render(resources, id);
    const textBox = screen.getByLabelText(nbText);
    await act(() => user.type(textBox, additionalValue));
    await act(() => user.tab());
    expect(queriesMock.upsertTextResources).toHaveBeenCalledTimes(1);
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, 'nb', {
      [id]: value + additionalValue,
    });
  });

  it('Check if reload is called when text is updated', async () => {
    const id = 'some-id';
    const value = 'Lorem';
    const additionalValue = ' ipsum';
    const resources: ITextResources = { nb: [{ id, value }] };
    const previewIframeRefMock = createRef<HTMLIFrameElement>();
    const reload = jest.fn();
    const previewIframeRef: RefObject<HTMLIFrameElement> = {
      current: {
        ...previewIframeRefMock.current,
        contentWindow: {
          ...previewIframeRefMock.current?.contentWindow,
          location: {
            ...previewIframeRefMock.current?.contentWindow?.location,
            reload,
          },
        },
      },
    };
    await render(resources, id, previewIframeRef);
    const textBox = screen.getByLabelText(nbText);
    await act(async () => user.type(textBox, additionalValue));
    await act(async () => user.tab());
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('upsertTextResources should not be called when the text is NOT changed', async () => {
    const id = 'some-id';
    const value = 'Lorem';
    const resources: ITextResources = { nb: [{ id, value }] };
    await render(resources, id);
    const textBox = screen.getByLabelText(nbText);
    await act(() => user.clear(textBox));
    await act(() => user.type(textBox, value));
    await act(() => user.tab());
    expect(queriesMock.upsertTextResources).not.toHaveBeenCalled();
  });

  it('upsertTextResources should not be called when the text resource does not exist and the text is empty', async () => {
    const id = 'some-id';
    const resources: ITextResources = { nb: [] };
    await render(resources, id);
    const textBox = screen.getByLabelText(nbText);
    await act(() => user.clear(textBox));
    await act(() => user.tab());
    expect(queriesMock.upsertTextResources).not.toHaveBeenCalled();
  });

  it('Does not throw any error when the user clicks inside and outside the text field without modifying the text', async () => {
    const id = 'some-id';
    const value = 'Lorem';
    const resources: ITextResources = { nb: [{ id, value }] };
    await render(resources, id);
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const textBox = screen.getByLabelText(nbText);
    fireEvent.click(textBox);
    fireEvent.click(document.body);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('Dispatches correct action when the close button is clicked', async () => {
    const id = 'some-id';
    const value = 'Lorem';
    const resources = { nb: [{ id, value }] };
    const { store } = await render(resources, id);
    await act(() => user.click(screen.getByRole('button', { name: closeText })));
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('textResources/setCurrentEditId');
    expect(actions[0].payload).toBeUndefined();
  });
});

const render = async (
  resources: ITextResources = {},
  editId?: string,
  previewIframeRef: RefObject<HTMLIFrameElement> = appContextMock.previewIframeRef,
) => {
  const textResources: ITextResourcesState = {
    ...textResourcesMock,
    currentEditId: editId,
  };

  const appData: IAppDataState = {
    ...appDataMock,
    textResources,
  };

  const { result } = renderHookWithMockStore(
    { appData },
    {
      getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(textLanguagesMock)),
      getTextResources: (_o, _a, lang) =>
        Promise.resolve<ITextResourcesWithLanguage>({
          language: lang,
          resources: resources[lang] || [],
        }),
    },
    undefined,
    { previewIframeRef },
  )(() => useTextResourcesQuery(org, app)).renderHookResult;
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return renderWithMockStore({ appData }, {}, undefined, { previewIframeRef })(
    <TextResourceEdit />,
  );
};
