import React from 'react';
import userEvent from '@testing-library/user-event';
import type { ITextResource, ITextResources } from 'app-shared/types/global';
import { createQueryClientMock, queryClientMock } from 'app-shared/mocks/queryClientMock';
import type { TextResourceProps } from './TextResource';
import { TextResource } from './TextResource';
import { renderWithProviders } from '../../testing/mocks';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { typedLocalStorage } from '@studio/pure-functions';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { appContextMock } from '../../testing/appContextMock';
import { app, org } from '@studio/testing/testids';
import { emptyTextResourceListMock } from 'app-shared/mocks/emptyTextResourceListMock';

const user = userEvent.setup();

// Test data:
const handleIdChange = jest.fn();
const handleRemoveTextResource = jest.fn();
const defaultProps: TextResourceProps = { handleIdChange, handleRemoveTextResource };
const textValue = 'Some text value';
const idText = 'test';

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

  it('Renders a button with the given label when no resource id is given', () => {
    const label = 'Lorem ipsum';
    renderTextResource({ label });
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('Calls handleIdChange when the button is clicked', async () => {
    const label = 'Lorem ipsum';
    renderTextResource({ label });
    await user.click(screen.getByRole('button', { name: label }));
    expect(handleIdChange).toHaveBeenCalledTimes(1);
  });

  it('Opens the text resource fieldset when the text resource button is clicked', async () => {
    const label = 'Lorem ipsum';
    renderTextResource({ label });
    await user.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('group', { name: label })).toBeInTheDocument();
  });

  it('Calls handleIdChange with expected id when add button is clicked', async () => {
    const label = 'Title';
    renderTextResource({
      label,
      generateIdOptions: {
        componentId: 'test-id',
        layoutId: 'Page1',
        textResourceKey: 'title',
      },
    });
    const addButton = screen.getByRole('button', { name: label });
    await user.click(addButton);
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith('Page1.test-id.title');
  });

  it('Renders value of resource with given id', () => {
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    renderTextResource({ textResourceId }, [textResource]);
    expect(screen.getByText(value)).toBeInTheDocument();
  });

  it('Renders button with value when valid resource id is given', () => {
    const label = 'Title';
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    renderTextResource({ label, textResourceId }, [textResource]);
    const button = screen.getByRole('button', { name: label });
    expect(button).toHaveTextContent(value);
  });

  it('Does not call handleIdChange when the button is clicked and there is already a binding', async () => {
    const label = 'Title';
    const textResourceId = 'some-id';
    const value = 'Lorem ipsum dolor sit amet';
    const textResource: ITextResource = { id: textResourceId, value };
    renderTextResource({ label, textResourceId }, [textResource]);
    await user.click(screen.getByRole('button', { name: label }));
    expect(handleIdChange).not.toHaveBeenCalled();
  });

  it('Does not render search section by default', () => {
    renderTextResource();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Renders search section when search button is clicked', async () => {
    await renderAndOpenSearchSection();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Renders correct number of options in search section', async () => {
    await renderAndOpenSearchSection();
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    await user.click(combobox);
    expect(screen.getAllByRole('option')).toHaveLength(textResources.length + 1); // + 1 because of the "none" option
  });

  it('Calls handleIdChange when selection in search section is changed', async () => {
    await renderAndOpenSearchSection();

    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: textResources[1].id }),
    );

    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(textResources[1].id);
  });

  it('Calls handleIdChange with undefined when "none" is selected', async () => {
    await renderAndOpenSearchSection();
    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: textMock('ux_editor.search_text_resources_none') }),
    );
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(undefined);
  });

  it('Calls handleRemoveTextResourceBinding when the user clicks the delete button and confirms', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const label = 'Test';
    const testTextResource = { id: idText, value: textValue };
    renderTextResource({ label, textResourceId: idText }, [testTextResource]);
    await user.click(screen.getByRole('button', { name: label }));
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(handleRemoveTextResource).toHaveBeenCalledTimes(1);
  });

  it('Does not call handleRemoveTextResourceBinding when the user cancels the deletion', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    const label = 'Test';
    const testTextResource = { id: idText, value: textValue };
    renderTextResource({ label, textResourceId: idText }, [testTextResource]);
    await user.click(screen.getByRole('button', { name: label }));
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(handleRemoveTextResource).not.toHaveBeenCalled();
  });

  it('Renders delete button as disabled when no handleRemoveTextResource is given', async () => {
    const label = 'Test';
    renderTextResource({ label, handleRemoveTextResource: undefined });
    await user.click(screen.getByRole('button', { name: label }));
    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeDisabled();
  });

  it('Closes the text resource fieldset when the close button is clicked', async () => {
    const label = 'Test';
    renderTextResource({ label });
    await user.click(screen.getByRole('button', { name: label }));
    const textArea = screen.getByRole('textbox');
    await user.type(textArea, textValue);
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    expect(screen.queryByRole('group', { name: label })).not.toBeInTheDocument();
  });

  it('Displays textbox with given value', async () => {
    const label = 'Test';
    const textResourceId = textResources[0].id;
    renderTextResource({ label, textResourceId }, textResources);
    await user.click(screen.getByRole('button', { name: label }));
    const textboxLabel = textMock('ux_editor.text_resource_binding_text');
    const textbox = screen.getByRole('textbox', { name: textboxLabel });
    expect(textbox).toHaveValue(textResources[0].value);
  });

  it('Mutates text resource when save button is clicked', async () => {
    const label = 'Test';
    const textResourceId = textResources[0].id;
    const upsertTextResources = jest
      .fn()
      .mockImplementation(() => Promise.resolve(emptyTextResourceListMock(DEFAULT_LANGUAGE)));
    renderTextResource({ label, textResourceId }, textResources, { upsertTextResources });
    await user.click(screen.getByRole('button', { name: label }));
    const textboxLabel = textMock('ux_editor.text_resource_binding_text');
    const textbox = screen.getByRole('textbox', { name: textboxLabel });
    await user.type(textbox, 'a');
    await user.click(screen.getByRole('button', { name: textMock('general.save') }));
    expect(upsertTextResources).toHaveBeenCalledTimes(1);
    expect(upsertTextResources).toHaveBeenCalledWith(org, app, DEFAULT_LANGUAGE, {
      [textResourceId]: textResources[0].value + 'a',
    });
    expect(appContextMock.updateTextsForPreview).toHaveBeenCalledTimes(1);
    expect(appContextMock.updateTextsForPreview).toHaveBeenCalledWith(DEFAULT_LANGUAGE);
  });

  it('Disables save button when text is cleared', async () => {
    const label = 'Test';
    const textResourceId = textResources[0].id;
    const upsertTextResources = jest.fn().mockImplementation(() => Promise.resolve());
    renderTextResource({ label, textResourceId }, textResources, { upsertTextResources });
    await user.click(screen.getByRole('button', { name: label }));
    const textboxLabel = textMock('ux_editor.text_resource_binding_text');
    const textbox = screen.getByRole('textbox', { name: textboxLabel });
    await user.clear(textbox);
    const saveButton = screen.getByRole('button', { name: textMock('general.save') });
    expect(saveButton).toBeDisabled();
    expect(upsertTextResources).toHaveBeenCalledTimes(0);
  });

  it('Does not show scrollbar when text content is shorter than default min height', async () => {
    const label = 'Test';
    const textResourceId = textResources[0].id;
    const upsertTextResources = jest.fn().mockImplementation(() => Promise.resolve());
    renderTextResource({ label, textResourceId }, textResources, { upsertTextResources });
    await user.click(screen.getByRole('button', { name: label }));
    const textboxLabel = textMock('ux_editor.text_resource_binding_text');
    const textbox = screen.getByRole('textbox', { name: textboxLabel });
    expect(textbox.style.height).toBe('100px'); // the min height passed to the useAutoSizeTextArea hook from TextResourceValueEditor
    expect(textbox.style.overflow).toBe('hidden');
  });
});

const renderAndOpenSearchSection = async () => {
  const label = 'Test';
  const textResourceId = textResources[0].id;
  renderTextResource({ label, textResourceId }, textResources);
  const textResourceButton = screen.getByRole('button', { name: label });
  await user.click(textResourceButton);
  const searchTab = screen.getByRole('tab', {
    name: textMock('ux_editor.text_resource_binding_search'),
  });
  await user.click(searchTab);
};

const renderTextResource = (
  props: Partial<TextResourceProps> = {},
  resources: ITextResource[] = [],
  queries: Partial<ServicesContextProps> = {},
) => {
  const queryClient = createQueryClientMock();
  const textResourcesList: ITextResources = {
    [DEFAULT_LANGUAGE]: resources,
  };
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResourcesList);

  return renderWithProviders(<TextResource {...defaultProps} {...props} />, {
    queryClient,
    queries,
  });
};
