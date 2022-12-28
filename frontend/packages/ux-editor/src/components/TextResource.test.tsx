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
const texts = {
  'general.add': addText,
  'general.edit': editText
}

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
});

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
