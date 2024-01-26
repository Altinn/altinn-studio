import React from 'react';
import userEvent from '@testing-library/user-event';
import type { ITextResource, ITextResourcesWithLanguage } from 'app-shared/types/global';
import { queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { TextResourceProps } from './TextResource';
import { TextResource } from './TextResource';
import { renderHookWithMockStore, renderWithMockStore, textLanguagesMock } from '../testing/mocks';
import { useLayoutSchemaQuery } from '../hooks/queries/useLayoutSchemaQuery';
import { act, screen, waitFor } from '@testing-library/react';
import { textMock } from '../../../../testing/mocks/i18nMock';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { typedLocalStorage } from 'app-shared/utils/webStorage';
import { addFeatureFlagToLocalStorage } from 'app-shared/utils/featureToggleUtils';

const user = userEvent.setup();

// Test data:
const org = 'org';
const app = 'app';
const handleIdChange = jest.fn();
const defaultProps: TextResourceProps = { handleIdChange };

const textResources: ITextResource[] = [
  { id: '1', value: 'Text 1' },
  { id: '2', value: 'Text 2' },
  { id: '3', value: 'Text 3' },
];

describe('TextResource', () => {
  afterEach(() => {
    jest.clearAllMocks();
    queryClientMock.clear();
    typedLocalStorage.removeItem('featureFlags');
  });

  it('Renders add button when no resource id is given', async () => {
    await render();
    expect(screen.getByLabelText(textMock('general.add'))).toBeInTheDocument();
  });

  it('Calls handleIdChange and dispatches correct actions when add button is clicked', async () => {
    const { store } = await render();
    await act(() => user.click(screen.getByLabelText(textMock('general.add'))));
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
    await act(() => user.click(screen.getByLabelText(textMock('general.add'))));
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
    expect(screen.getByLabelText(textMock('general.edit'))).toBeInTheDocument();
  });

  it('Dispatches correct action and does not call handleIdChange when edit button is clicked', async () => {
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    const { store } = await render({ textResourceId }, [textResource]);
    await act(() => user.click(screen.getByLabelText(textMock('general.edit'))));
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
    await act(() =>
      user.click(
        screen.getByRole('combobox', { name: textMock('ux_editor.search_text_resources_label') }),
      ),
    );
    await act(() => user.click(screen.getByRole('option', { name: textResources[1].id })));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(textResources[1].id);
  });

  it('Calls handleIdChange with undefined when "none" is selected', async () => {
    await renderAndOpenSearchSection();
    await act(() =>
      user.click(
        screen.getByRole('combobox', { name: textMock('ux_editor.search_text_resources_label') }),
      ),
    );
    await act(() =>
      user.click(
        screen.getByRole('option', { name: textMock('ux_editor.search_text_resources_none') }),
      ),
    );
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(undefined);
  });

  it('Closes search section when close button is clicked', async () => {
    await renderAndOpenSearchSection();
    await act(() =>
      user.click(screen.getByLabelText(textMock('ux_editor.search_text_resources_close'))),
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Renders confirm dialog when delete button is clicked', async () => {
    await render({ textResourceId: 'test', handleRemoveTextResource: jest.fn() });
    await act(() => user.click(screen.getByRole('button', { name: textMock('general.delete') })));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.text_resource_bindings.delete_confirm')),
    ).toBeInTheDocument();
  });

  it('Calls handleRemoveTextResourceBinding is called when confirm delete button is clicked', async () => {
    const handleRemoveTextResource = jest.fn();
    await render({ handleRemoveTextResource, textResourceId: 'test' });
    await act(() => user.click(screen.getByRole('button', { name: textMock('general.delete') })));
    await act(() =>
      user.click(
        screen.getByRole('button', {
          name: textMock('ux_editor.text_resource_bindings.delete_confirm'),
        }),
      ),
    );
    expect(handleRemoveTextResource).toHaveBeenCalledTimes(1);
  });

  it('Does not call handleRemoveTextResourceBinding is called when cancel delete button is clicked', async () => {
    const handleRemoveTextResource = jest.fn();
    await render({ handleRemoveTextResource, textResourceId: 'test' });
    await act(() => user.click(screen.getByRole('button', { name: textMock('general.delete') })));
    await act(() => user.click(screen.getByRole('button', { name: textMock('general.cancel') })));
    expect(handleRemoveTextResource).not.toHaveBeenCalled();
  });

  it('Renders delete button as disabled when no handleRemoveTextResource is given', async () => {
    await render();
    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeDisabled();
  });

  it('Renders delete button as disabled when handleRemoveTextResource is given, but no resource id is given', async () => {
    await render({ handleRemoveTextResource: jest.fn() });
    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeDisabled();
  });

  it('Renders delete button as enabled when handleRemoveTextResource and resource id is given', async () => {
    await render({ textResourceId: 'test', handleRemoveTextResource: jest.fn() });
    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeEnabled();
  });

  it('Renders delete button as enabled when handleRemoveTextResource is given and componentConfigBeta feature flag is enabled', async () => {
    addFeatureFlagToLocalStorage('componentConfigBeta');
    await render({ textResourceId: 'test', handleRemoveTextResource: jest.fn() });
    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeEnabled();
  });
});

const renderAndOpenSearchSection = async () => {
  await render(undefined, textResources);
  await act(() => user.click(screen.getByLabelText(textMock('general.search'))));
};

const waitForData = async (resources: ITextResource[]) => {
  const { result } = renderHookWithMockStore(
    {},
    {
      getTextResources: jest.fn().mockImplementation(() =>
        Promise.resolve<ITextResourcesWithLanguage>({
          language: DEFAULT_LANGUAGE,
          resources,
        }),
      ),
      getTextLanguages: jest.fn().mockImplementation(() => Promise.resolve(textLanguagesMock)),
    },
  )(() => useTextResourcesQuery(org, app)).renderHookResult;
  const layoutSchemaResult = renderHookWithMockStore()(() => useLayoutSchemaQuery())
    .renderHookResult.result;
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await waitFor(() => expect(layoutSchemaResult.current[0].isSuccess).toBe(true));
};

const render = async (props: Partial<TextResourceProps> = {}, resources: ITextResource[] = []) => {
  await waitForData(resources);

  return renderWithMockStore()(<TextResource {...defaultProps} {...props} />);
};
