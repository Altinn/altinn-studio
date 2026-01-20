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
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { app, org } from '@studio/testing/testids';

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
  });

  it('Renders a button with the given label when no resource id is given', () => {
    const label = 'Lorem ipsum';
    renderTextResource({ label });
    expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
  });

  it('Calls handleIdChange with expected id when card is opened, updated and saved', async () => {
    const label = 'Lorem ipsum';
    renderTextResource({
      label,
      generateIdOptions: {
        componentId: 'test-id',
        layoutId: 'Page1',
        textResourceKey: 'title',
      },
    });
    await openCard(label);
    await fillTextAndSave();
    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(
      expect.stringMatching(/^Page1\.test-id\.title\..+$/),
    );
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

  it('Does not render search section by default', () => {
    renderTextResource();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('Renders search section when search button is clicked', async () => {
    await renderAndOpenSearchSection();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('Renders info message only when search is disabled', async () => {
    await renderAndOpenSearchSection({ disableSearch: true });
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        textMock('ux_editor.modal_properties_textResourceBindings_page_name_search_disabled'),
      ),
    ).toBeInTheDocument();
  });

  it('Renders correct number of options in search section', async () => {
    await renderAndOpenSearchSection();
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    await user.click(combobox);
    expect(screen.getAllByRole('option')).toHaveLength(textResources.length + 1); // + 1 because of the "none" option
  });

  it('Calls handleIdChange when selection in search section is changed and saved', async () => {
    await renderAndOpenSearchSection();

    await user.selectOptions(
      screen.getByRole('combobox'),
      screen.getByRole('option', { name: textResources[1].id }),
    );
    await user.click(getSaveButton());

    expect(handleIdChange).toHaveBeenCalledTimes(1);
    expect(handleIdChange).toHaveBeenCalledWith(textResources[1].id);
  });

  it('Calls handleRemoveTextResourceBinding when the user clicks the delete button and confirms', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const label = 'Test';
    const testTextResource = { id: idText, value: textValue };
    renderTextResource({ label, textResourceId: idText }, [testTextResource]);
    await openCard(label);
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(handleRemoveTextResource).toHaveBeenCalledTimes(1);
  });

  it('Does not call handleRemoveTextResourceBinding when the user cancels the deletion', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    const label = 'Test';
    const testTextResource = { id: idText, value: textValue };
    renderTextResource({ label, textResourceId: idText }, [testTextResource]);
    await openCard(label);
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    expect(handleRemoveTextResource).not.toHaveBeenCalled();
  });

  it('Renders delete button as disabled when no handleRemoveTextResource is given', async () => {
    const label = 'Test';
    renderTextResource({ label, handleRemoveTextResource: undefined });
    await openCard(label);
    expect(screen.getByRole('button', { name: textMock('general.delete') })).toBeDisabled();
  });

  it('Closes the card when cancel button is clicked', async () => {
    const label = 'Test';
    renderTextResource({ label });

    await openCard(label);
    expect(textbox()).toBeInTheDocument();
    const closeButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(closeButton);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('Displays textbox with given value', async () => {
    const label = 'Test';
    const textResourceId = textResources[0].id;
    renderTextResource({ label, textResourceId }, textResources);
    await user.click(screen.getByRole('button', { name: label }));
    expect(textbox()).toHaveValue(textResources[0].value);
  });

  it('Does not show scrollbar when text content is shorter than default min height', async () => {
    const label = 'Test';
    const textResourceId = textResources[0].id;
    const upsertTextResources = jest.fn().mockImplementation(() => Promise.resolve());
    renderTextResource({ label, textResourceId }, textResources, { upsertTextResources });
    await user.click(screen.getByRole('button', { name: label }));
    const textbox = screen.getByRole('textbox', {
      name: textMock('ux_editor.text_resource_binding_text'),
    });
    expect(textbox.style.height).toBe('100px'); // the min height passed to the useAutoSizeTextArea hook from TextResourceValueEditor
    expect(textbox.style.overflow).toBe('hidden');
  });
});

const getSaveButton = () => screen.getByRole('button', { name: textMock('general.save') });
const openCard = async (label?: string) => {
  const button = screen.getByRole('button', { name: label });
  await user.click(button);
};
const textbox = () =>
  screen.getByRole('textbox', {
    name: textMock('ux_editor.text_resource_binding_text'),
  });

const fillTextAndSave = async (text: string = textValue) => {
  await user.type(textbox(), text);
  await user.click(getSaveButton());
};

const renderAndOpenSearchSection = async (partialProps?: Partial<TextResourceProps>) => {
  const label = 'Test';
  const textResourceId = textResources[0].id;
  renderTextResource({ label, textResourceId, ...partialProps }, textResources);
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
