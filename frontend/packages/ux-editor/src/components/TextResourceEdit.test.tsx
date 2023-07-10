import React from 'react';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type { ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import type { ITextResources, ITextResourcesWithLanguage } from 'app-shared/types/global';
import userEvent from '@testing-library/user-event';
import { TextResourceEdit } from './TextResourceEdit';
import {
  appDataMock,
  queriesMock,
  queryClientMock,
  renderHookWithMockStore,
  renderWithMockStore,
  textResourcesMock
} from '../testing/mocks';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';

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
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
  );

describe('TextResourceEdit', () => {
  
  afterEach(() => {
    jest.clearAllMocks();
    queryClientMock.clear();
  });

  it('Does not render anything if edit id is undefined', async () => {
    const { renderResult } = await render();
    expect(renderResult.container).toBeEmptyDOMElement();
  });

  it('Renders correctly when a valid edit id is given', async () => {
    const id = 'some-id';
    const valueNb = 'Norge';
    const valueNn = 'Noreg';
    const valueEn = 'Norway';
    const resources: ITextResources = {
      nb: [{ id, value: valueNb }],
      nn: [{ id, value: valueNn }],
      en: [{ id, value: valueEn }]
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
    expect(queriesMock.upsertTextResources).toHaveBeenCalledWith(org, app, 'nb', { [id]: value +
       additionalValue });
  });

  it('Calls upsertTextResources with correct parameters when a text is NOT changed', async () => {
    const id = 'some-id';
    const oldValue = 'Lorem';
    const newValue = `${oldValue} ipsum`;
    const resources: ITextResources = { nb: [{ id, value: oldValue }] };
    await render(resources, id);
    const textBox = screen.getByLabelText(nbText);
    fireEvent.change(textBox, { target: { value: newValue } });
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

const render = async (resources: ITextResources = {}, editId?: string) => {
  const textResources: ITextResourcesState = {
    ...textResourcesMock,
    currentEditId: editId
  };

  const appData: IAppDataState = {
    ...appDataMock,
    textResources
  };

  const { result } = renderHookWithMockStore({ appData }, {
      getTextLanguages: () => Promise.resolve(['nb', 'nn', 'en']),
      getTextResources: (_o, _a, lang) => Promise.resolve<ITextResourcesWithLanguage>({
          language: lang,
          resources: resources[lang] || []
        }),
    })(() => useTextResourcesQuery(org, app)).renderHookResult;
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  return renderWithMockStore({ appData })(<TextResourceEdit/>);
};
