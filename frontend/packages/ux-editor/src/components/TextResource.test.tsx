import React from 'react';
import userEvent from '@testing-library/user-event';
import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';
import { TextResource, TextResourceProps } from './TextResource';
import {
  renderHookWithMockStore,
  renderWithMockStore,
} from '../testing/mocks';
import { act, screen, waitFor } from '@testing-library/react';
import { mockUseTranslation } from '../../../../testing/mocks/i18nMock';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { queryClient } from 'app-shared/contexts/ServicesContext';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const handleIdChange = jest.fn();
const defaultProps: TextResourceProps = { handleIdChange };
const addText = 'Legg til';
const editText = 'Rediger';
const searchText = 'Søk';
const closeSearchText = 'Lukk tekstsøk';
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
const textResources: ITextResource[] = [
  { id: '1', value: 'Text 1' },
  { id: '2', value: 'Text 2' },
  { id: '3', value: 'Text 3' },
];

// Mocks:
jest.mock(
  'react-i18next',
  () => ({ useTranslation: () => mockUseTranslation(texts) }),
);

describe('TextResource', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('Renders add button when no resource id is given', async () => {
    await render();
    expect(screen.getByLabelText(addText)).toBeInTheDocument();
  });

  it('Calls handleIdChange and dispatches correct actions when add button is clicked', async () => {
    const { store } = await render();
    await act(() => user.click(screen.getByLabelText(addText)));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('textResources/setCurrentEditId');
  });

  it('Calls handleIdChange and dispatches correct actions with expected id when add button is clicked', async () => {
    const { store } = await render({
      generateIdOptions: {
        componentId: 'test-id',
        layoutId: 'Page1',
        textResourceKey: 'title',
      },
    });
    await act(() => user.click(screen.getByLabelText(addText)));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith('Page1.test-id.title');
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('textResources/setCurrentEditId');
  });

  it('Renders placeholder text when no resource id is given', async () => {
    const placeholder = 'Legg til tekst her';
    await render({ placeholder });
    expect(screen.getByText(placeholder)).toBeInTheDocument();
  });

  it('Renders placeholder text when resource with given id is empty', async () => {
    const placeholder = 'Legg til tekst her';
    const textResourceId = 'some-id';
    const textResource: ITextResource = { id: textResourceId, value: '' };
    await render({ placeholder, textResourceId }, [textResource]);
    expect(screen.getByText(placeholder)).toBeInTheDocument();
  });

  it('Renders placeholder text when resource with given id does not exist', async () => {
    const placeholder = 'Legg til tekst her';
    const textResourceId = 'some-id';
    await render({ placeholder, textResourceId });
    expect(screen.getByText(placeholder)).toBeInTheDocument();
  });

  it('Renders value of resource with given id', async () => {
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    await render({ textResourceId }, [textResource]);
    expect(screen.getByText(value)).toBeInTheDocument();
  });

  it('Does not render placeholder text when resource with given id has a value', async () => {
    const placeholder = 'Legg til tekst her';
    const textResourceId = 'some-id';
    const textResource: ITextResource = { id: textResourceId, value: 'Lipsum' };
    await render({ placeholder, textResourceId }, [textResource]);
    expect(screen.queryByText(placeholder)).not.toBeInTheDocument();
  });

  it('Renders edit button when valid resource id is given', async () => {
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    await render({ textResourceId }, [textResource]);
    expect(screen.getByLabelText(editText)).toBeInTheDocument();
  });

  it('Dispatches correct action and does not call handleIdChange when edit button is clicked', async () => {
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    const { store } = await render({ textResourceId }, [textResource]);
    await act(() => user.click(screen.getByLabelText(editText)));
    expect(handleIdChange).toHaveBeenCalledTimes(0);
    const actions = store.getActions();
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe('textResources/setCurrentEditId');
    expect(actions[0].payload).toBe(textResourceId);
  });

  it('Renders label if given', async () => {
    const label = 'Lorem ipsum';
    await render({ label });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('Renders description if given', async () => {
    const description = 'Lorem ipsum dolor sit amet.';
    await render({ description });
    expect(screen.getByText(description)).toBeInTheDocument();
  });

  it('Does not render search section by default', async () => {
    await render();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Renders search section when search button is clicked', async () => {
    await renderAndOpenSearchSection();
    await expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Renders correct number of options in search section', async () => {
    await renderAndOpenSearchSection();
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    await act(() => user.click(combobox));
    expect(screen.getAllByRole('option')).toHaveLength(textResources.length + 1); // + 1 because of the "none" option
  });

  it('Calls handleIdChange when selection in search section is changed', async () => {
    await renderAndOpenSearchSection();
    await act(() => user.click(screen.getByRole('combobox', { name: searchLabelText })));
    await act(() => user.click(screen.getByRole('option', { name: textResources[1].id })));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(textResources[1].id);
  });

  it('Calls handleIdChange with undefined when "none" is selected', async () => {
    await renderAndOpenSearchSection();
    await act(() => user.click(screen.getByRole('combobox', { name: searchLabelText })));
    await act(() => user.click(screen.getByRole('option', { name: noTextChosenText })));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(undefined);
  });

  it('Closes search section when close button is clicked', async () => {
    await renderAndOpenSearchSection();
    await act(() => user.click(screen.getByLabelText(closeSearchText)));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});

const renderAndOpenSearchSection = async () => {
  await render(undefined, textResources);
  await act(() => user.click(screen.getByLabelText(searchText)));
};

const render = async (props: Partial<TextResourceProps> = {}, resources: ITextResource[] = []) => {

  const { result } = renderHookWithMockStore({}, {
    getTextResources: jest.fn().mockImplementation(() => Promise.resolve<ITextResourcesWithLanguage>({
      language: DEFAULT_LANGUAGE,
      resources,
    })),
  })(() => useTextResourcesQuery(org, app)).renderHookResult;
  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  return renderWithMockStore()(<TextResource {...defaultProps} {...props} />);
};
