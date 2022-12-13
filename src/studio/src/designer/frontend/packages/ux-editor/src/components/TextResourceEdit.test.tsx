import React from 'react';
import type { IAppDataState } from '../features/appData/appDataReducers';
import type { ILanguageState } from '../features/appData/language/languageSlice';
import type { ITextResources, ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import userEvent from '@testing-library/user-event';
import { TextResourceEdit } from './TextResourceEdit';
import { appDataMock, languageStateMock, renderWithMockStore, textResourcesMock } from '../testing/mocks';
import { screen } from '@testing-library/react';

const user = userEvent.setup();

// Test data:
const legendText = 'Rediger tekst';
const descriptionText = 'Tekstens ID: {id}';
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

describe('TextResourceEdit', () => {

  afterEach(jest.resetAllMocks);

  it('Does not render anything if edit id is undefined', () => {
    const { renderResult } = render();
    expect(renderResult.container).toBeEmptyDOMElement();
  });

  it('Renders correctly when a valid edit id is given', () => {
    const id = 'some-id';
    const valueNb = 'Norge';
    const valueNn = 'Noreg';
    const valueEn = 'Norway';
    const resources = {
      nb: [{ id, value: valueNb }],
      nn: [{ id, value: valueNn }],
      en: [{ id, value: valueEn }]
    };
    render(resources, id);
    expect(screen.getByText(legendText)).toBeInTheDocument();
    expect(screen.getByText(id, { exact: false })).toBeInTheDocument();
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
    expect(screen.getByLabelText(nbText)).toHaveValue(valueNb);
    expect(screen.getByLabelText(nnText)).toHaveValue(valueNn);
    expect(screen.getByLabelText(enText)).toHaveValue(valueEn);
    expect(screen.getByRole('button', { name: closeText })).toBeInTheDocument();
  });

  it('Dispatches correct action when a text is changed', async () => {
    const id = 'some-id';
    const value = 'Lorem';
    const additionalValue = ' ipsum';
    const resources = { nb: [{ id, value }] };
    const { store } = render(resources, id);
    const textBox = screen.getByLabelText(nbText);
    await user.type(textBox, additionalValue);
    await user.tab();
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('textResources/upsertTextResources');
    expect(actions[0].payload.language).toBe('nb');
    expect(Object.keys(actions[0].payload.textResources)).toHaveLength(1);
    expect(actions[0].payload.textResources[id]).toBe(value + additionalValue);
  });

  it('Dispatches correct action when the close button is clicked', async () => {
    const id = 'some-id';
    const value = 'Lorem';
    const resources = { nb: [{ id, value }] };
    const { store } = render(resources, id);
    await user.click(screen.getByRole('button', { name: closeText }));
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('textResources/setCurrentEditId');
    expect(actions[0].payload).toBeUndefined();
  });
});

const render = (resources?: ITextResources, editId?: string) => {

  const languageState: ILanguageState = {
    ...languageStateMock,
    language: texts
  };

  const textResources: ITextResourcesState = {
    ...textResourcesMock,
    resources,
    currentEditId: editId
  };

  const appData: IAppDataState = {
    ...appDataMock,
    languageState,
    textResources
  };

  return renderWithMockStore({ appData })(<TextResourceEdit/>);
};
