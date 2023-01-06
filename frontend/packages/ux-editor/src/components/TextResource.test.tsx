import React from 'react';
import type { ILanguageState } from '../features/appData/language/languageSlice';
import userEvent from '@testing-library/user-event';
import { IAppDataState } from '../features/appData/appDataReducers';
import { ITextResource } from '../types/global';
import { ITextResourcesState } from '../features/appData/textResources/textResourcesSlice';
import { TextResource, TextResourceProps } from './TextResource';
import { appDataMock, languageStateMock, renderWithMockStore, textResourcesMock } from '../testing/mocks';
import { screen } from '@testing-library/react';

const user = userEvent.setup();

// Test data:
const handleIdChange = jest.fn();
const defaultProps: TextResourceProps = { handleIdChange }
const addText = 'Legg til';
const editText = 'Rediger';
const searchText = 'Søk';
const closeSearchText = 'ukk tekstsøk';
const searchLabelText = 'Velg tekst-ID';
const noTextChosenText = 'Ingen tekst';
const texts = {
  'general.add': addText,
  'general.edit': editText,
  'general.search': searchText,
  'ux_editor.search_text_resources_close': closeSearchText,
  'ux_editor.search_text_resources_label': searchLabelText,
  'ux_editor.search_text_resources_none': noTextChosenText,
};
const textResources = [
  { id: '1', value: 'Text 1' },
  { id: '2', value: 'Text 2' },
  { id: '3', value: 'Text 3' },
];

describe('TextResource', () => {

  afterEach(jest.resetAllMocks);

  it('Renders add button when no resource id is given', () => {
    render();
    expect(screen.getByLabelText(addText)).toBeInTheDocument();
  });

  it('Calls handleIdChange and dispatches correct actions when add button is clicked', async () => {
    const { store } = render();
    await user.click(screen.getByLabelText(addText));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    const actions = store.getActions();
    expect(actions).toHaveLength(2);
    expect(actions[0].type).toBe('textResources/upsertTextResources');
    expect(actions[1].type).toBe('textResources/setCurrentEditId');
  });

  it('Renders placeholder text when no resource id is given', () => {
    const placeholder = 'Legg til tekst her';
    render({ placeholder });
    expect(screen.getByText(placeholder)).toBeInTheDocument();
  });

  it('Renders placeholder text when resource with given id is empty', () => {
    const placeholder = 'Legg til tekst her';
    const textResourceId = 'some-id';
    const textResource: ITextResource = { id: textResourceId, value: '' };
    render({ placeholder, textResourceId }, [textResource]);
    expect(screen.getByText(placeholder)).toBeInTheDocument();
  });

  it('Renders placeholder text when resource with given id does not exist', () => {
    const placeholder = 'Legg til tekst her';
    const textResourceId = 'some-id';
    render({ placeholder, textResourceId });
    expect(screen.getByText(placeholder)).toBeInTheDocument();
  });

  it('Renders value of resource with given id', () => {
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    render({ textResourceId }, [textResource]);
    expect(screen.getByText(value)).toBeInTheDocument();
  });

  it('Does not render placeholder text when resource with given id has a value', () => {
    const placeholder = 'Legg til tekst her';
    const textResourceId = 'some-id';
    const textResource: ITextResource = { id: textResourceId, value: 'Lipsum' };
    render({ placeholder, textResourceId }, [textResource]);
    expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
  });

  it('Renders edit button when valid resource id is given', () => {
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    render({ textResourceId }, [textResource]);
    expect(screen.getByLabelText(editText)).toBeInTheDocument();
  });

  it('Dispatches correct action and does not call handleIdChange when edit button is clicked', async () => {
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    const { store } = render({ textResourceId }, [textResource]);
    await user.click(screen.getByLabelText(editText));
    expect(handleIdChange).toHaveBeenCalledTimes(0);
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('textResources/setCurrentEditId');
    expect(actions[0].payload).toBe(textResourceId);
  });

  it('Renders label if given', () => {
    const label = 'Lorem ipsum';
    render({ label });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('Renders description if given', () => {
    const description = 'Lorem ipsum dolor sit amet.';
    render({ description });
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('Does not render search section by default', () => {
    render();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Renders search section when search button is clicked', async () => {
    await renderAndOpenSearchSection();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Renders correct number of options in search section', async () => {
    await renderAndOpenSearchSection();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(textResources.length + 1); // + 1 because of the "none" option
  });

  it('Calls handleIdChange when selection in search section is changed', async () => {
    await renderAndOpenSearchSection();
    await user.click(screen.getByLabelText(searchLabelText));
    await user.click(screen.getByRole('option', { name: textResources[1].id }));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(textResources[1].id);
  });

  it('Calls handleIdChange with undefined when "none" is selected', async () => {
    await renderAndOpenSearchSection();
    await user.click(screen.getByLabelText(searchLabelText));
    await user.click(screen.getByRole('option', { name: noTextChosenText }));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(undefined);
  });

  it('Closes search section when close button is clicked', async () => {
    await renderAndOpenSearchSection();
    await user.click(screen.getByLabelText(closeSearchText));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

const renderAndOpenSearchSection = async () => {
  render(undefined, textResources);
  await user.click(screen.getByLabelText(searchText));
};

const render = (props?: Partial<TextResourceProps>, resources?: ITextResource[]) => {

  const languageState: ILanguageState = {
    ...languageStateMock,
    language: texts
  };

  const textResources: ITextResourcesState = {
    ...textResourcesMock,
    resources: {
      ...textResourcesMock.resources,
      nb: resources ?? []
    }
  };

  const appData: IAppDataState = {
    ...appDataMock,
    languageState,
    textResources
  };

  return renderWithMockStore({ appData })(
    <TextResource {...{ ...defaultProps, ...props }}/>
  );
};
