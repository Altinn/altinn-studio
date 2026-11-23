import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { ITextResources } from 'app-shared/types/global';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { getLanguageFromCode } from '@app/language';
import { AppBuilderProvider } from '../../contexts/AppBuilderContext';
import type { DataModel } from '../../hooks/useDataModelQuery';
import { usePageLayoutsQuery } from '../../hooks/usePageLayoutsQuery';
import type { LayoutComponent, PageLayout, PageLayouts } from '../../types';
import { getTextsById } from '../../utils/textUtils';
import { PageCanvas } from './PageCanvas';
import type { PageCanvasProps } from './PageCanvas';

const org = 'org';
const app = 'app';
const layoutSetName = 'form';
const pageName = 'side1';

const heading: LayoutComponent = {
  id: 'heading',
  type: ComponentType.Heading,
  textResourceBindings: { title: 'heading.title' },
  size: 'L',
};
const choice: LayoutComponent = {
  id: 'choice',
  type: ComponentType.RadioButtons,
  textResourceBindings: { title: 'choice.title' },
  options: [
    { value: 'early', label: 'choice.early' },
    { value: 'late', label: 'choice.late' },
  ],
};
const reason: LayoutComponent = {
  id: 'reason',
  type: ComponentType.TextArea,
  textResourceBindings: { title: 'reason.title' },
  required: true,
};
const group: LayoutComponent = {
  id: 'group',
  type: ComponentType.Group,
  textResourceBindings: { title: 'group.title' },
  children: [],
};
const groupChild: LayoutComponent = { id: 'groupChild', type: ComponentType.Paragraph };
const groupWithChild: LayoutComponent = { ...group, children: [groupChild.id] };
const map: LayoutComponent = { id: 'map', type: ComponentType.Map };

const createLayout = (components: LayoutComponent[]): PageLayout => ({
  $schema: 'schema',
  data: { layout: components },
});

const defaultLayouts: PageLayouts = { [pageName]: createLayout([heading, choice, reason, map]) };

const nbTexts: Record<string, string> = {
  [pageName]: 'Søknaden',
  'heading.title': 'Søknad om skolestart',
  'choice.title': 'Hva søker du om?',
  'choice.early': 'Tidlig skolestart',
  'choice.late': 'Utsatt skolestart',
  'reason.title': 'Begrunnelse',
  'group.title': 'Den andre forelderen',
};

const schema: JsonSchema = { type: 'object', properties: { fornavn: { type: 'string' } } };
const dataModel: DataModel = {
  dataType: 'model',
  modelPath: '/App/models/model.schema.json',
  schema,
};

describe('PageCanvas', () => {
  it('shows the components as the app shows them, and the page name', () => {
    renderPageCanvas();
    expect(screen.getByRole('heading', { name: nbTexts['heading.title'] })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: nbTexts['choice.early'] })).toBeInTheDocument();
    expect(screen.getByText(nbTexts[pageName])).toBeInTheDocument();
  });

  it('says that a page without components is empty', () => {
    renderPageCanvas({ layouts: { [pageName]: createLayout([]) } });
    expect(screen.getByText(textMock('app_builder.empty_page'))).toBeInTheDocument();
  });

  it('shows a placeholder for a component type that cannot be shown yet', () => {
    renderPageCanvas();
    const message = textMock('app_builder.unsupported_component', { componentType: 'Map' });
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('shows a dropdown closed, and leaves adding its options to the settings', async () => {
    const user = userEvent.setup();
    const dropdown: LayoutComponent = { ...choice, id: 'school', type: ComponentType.Dropdown };
    renderPageCanvas({ layouts: { [pageName]: createLayout([dropdown]) } });

    await user.click(getSelectButton(nbTexts['choice.title']));
    expect(screen.queryByText(nbTexts['choice.early'])).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: textMock('app_builder.add_option') }),
    ).not.toBeInTheDocument();
  });

  it('saves the label of an option edited in place', async () => {
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    renderPageCanvas({}, { upsertTextResources });

    const optionText = getEditableText(nbTexts['choice.early']);
    fireEvent.focusIn(optionText);
    optionText.textContent = 'Skolestart før seks år';
    fireEvent.focusOut(optionText);

    await waitFor(() =>
      expect(upsertTextResources).toHaveBeenCalledWith(org, app, 'nb', {
        'choice.early': 'Skolestart før seks år',
      }),
    );
  });

  it('gives an added option focus, with its default text selected to be typed over', async () => {
    const user = userEvent.setup();
    renderPageCanvas();

    await user.click(getSelectButton(nbTexts['choice.title']));
    await user.click(screen.getByRole('button', { name: textMock('app_builder.add_option') }));

    // The mocked save does not update the texts, so the new option shows its text key.
    const optionText = await screen.findByText(new RegExp(`^${pageName}\\.choice\\.option`), {
      selector: '[role="textbox"]',
    });
    await waitFor(() => expect(optionText).toHaveFocus());
    expect(document.getSelection()?.toString()).toBe(optionText.textContent);
  });

  it('shows the tools of a component when it is selected, and hides them on Escape', async () => {
    const user = userEvent.setup();
    renderPageCanvas();

    await user.click(getSelectButton(nbTexts['reason.title']));
    expect(getToolbar()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(queryToolbar()).not.toBeInTheDocument();
  });

  it('saves a text edited in place when the user leaves it', async () => {
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    renderPageCanvas({}, { upsertTextResources });

    const headingText = getEditableText(nbTexts['heading.title']);
    fireEvent.focusIn(headingText);
    headingText.textContent = 'Søknad om tidlig skolestart';
    fireEvent.focusOut(headingText);

    await waitFor(() =>
      expect(upsertTextResources).toHaveBeenCalledWith(org, app, 'nb', {
        'heading.title': 'Søknad om tidlig skolestart',
      }),
    );
  });

  it('does not save a text when the user presses Escape', async () => {
    const upsertTextResources = vi.fn();
    renderPageCanvas({}, { upsertTextResources });

    const headingText = getEditableText(nbTexts['heading.title']);
    fireEvent.focusIn(headingText);
    headingText.textContent = 'Something else';
    fireEvent.keyDown(headingText, { key: 'Escape' });
    fireEvent.focusOut(headingText);

    await new Promise((resolve) => setTimeout(resolve));
    expect(upsertTextResources).not.toHaveBeenCalled();
  });

  it('saves the page with the component moved down', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getSelectButton(nbTexts['heading.title']));
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.move_component_down') }),
    );

    expect(getSavedIds(saveFormLayout)).toEqual(['choice', 'heading', 'reason', 'map']);
  });

  it('makes a field take half the width', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getSelectButton(nbTexts['reason.title']));
    await user.click(screen.getByRole('radio', { name: textMock('app_builder.width.half') }));

    expect(getSavedComponent(saveFormLayout, 'reason').grid).toEqual({ xs: 12, md: 6 });
  });
});

describe('PageCanvas, required and rules', () => {
  it('makes a required field optional from the menu on its tag', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getRequiredTag());
    await user.click(
      screen.getByRole('menuitemradio', { name: textMock('app_builder.required_menu.optional') }),
    );

    expect(getSavedComponent(saveFormLayout, 'reason')).not.toHaveProperty('required');
  });

  it('makes a field required only when another field has a value', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getRequiredTag());
    await user.click(
      screen.getByRole('menuitemradio', {
        name: textMock('app_builder.required_menu.conditional'),
      }),
    );

    expect(getSavedComponent(saveFormLayout, 'reason').required).toEqual([
      'equals',
      ['component', 'choice'],
      'early',
    ]);
  });

  it('adds a rule that shows the component only when another field has a value', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getSelectButton(nbTexts['reason.title']));
    await user.click(screen.getByRole('button', { name: textMock('app_builder.rule.add') }));

    expect(getSavedComponent(saveFormLayout, 'reason').hidden).toEqual([
      'notEquals',
      ['component', 'choice'],
      'early',
    ]);
  });

  it('shows a rule as a sentence the user can change', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const reasonWithRule = { ...reason, hidden: ['notEquals', ['component', 'choice'], 'early'] };
    renderPageCanvas(
      { layouts: { [pageName]: createLayout([heading, choice, reasonWithRule]) } },
      { saveFormLayout },
    );

    await user.click(getSelectButton(nbTexts['reason.title']));
    await user.selectOptions(
      screen.getByRole('combobox', { name: textMock('app_builder.rule.value') }),
      'late',
    );

    expect(getSavedComponent(saveFormLayout, 'reason').hidden).toEqual([
      'notEquals',
      ['component', 'choice'],
      'late',
    ]);
  });
});

describe('PageCanvas, adding components', () => {
  it('adds a heading at the end of the page and opens its text for editing', async () => {
    const user = userEvent.setup();
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { upsertTextResources, saveFormLayout });

    await user.click(getAddComponentButton());
    expect(screen.getByText(textMock('app_builder.add_component.end'))).toBeInTheDocument();
    await user.click(getComponentTypeButton('Heading'));

    const [, , language, savedTexts] = upsertTextResources.mock.calls[0];
    expect(language).toBe('nb');
    expect(Object.values(savedTexts)).toEqual([textMock('app_builder.default_text.Heading')]);
    expect(getSavedComponents(saveFormLayout).at(-1)).toMatchObject({ type: 'Heading', size: 'L' });
  });

  it('adds a component at the end of the page when another is selected', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas(
      { layouts: { [pageName]: createLayout([heading, groupWithChild, groupChild]) } },
      { saveFormLayout },
    );

    await user.click(getSelectButton(nbTexts['heading.title']));
    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('Paragraph'));

    const savedComponents = getSavedComponents(saveFormLayout);
    expect(savedComponents.at(-1)).toMatchObject({ type: 'Paragraph' });
    expect(savedComponents[1]).toMatchObject({ children: [groupChild.id] });
  });

  it('adds a component last in a group', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas(
      { layouts: { [pageName]: createLayout([heading, groupWithChild, groupChild]) } },
      { saveFormLayout },
    );

    const addHereButtons = screen.getAllByRole('button', {
      name: textMock('app_builder.add_here'),
    });
    await user.click(addHereButtons.at(-1));
    expect(
      screen.getByText(
        textMock('app_builder.add_component.in_group', { name: nbTexts['group.title'] }),
      ),
    ).toBeInTheDocument();
    await user.click(getComponentTypeButton('Alert'));

    const [, savedGroup, , alert] = getSavedComponents(saveFormLayout);
    expect(alert).toMatchObject({ type: 'Alert' });
    expect(savedGroup).toMatchObject({ children: [groupChild.id, alert.id] });
  });

  it('asks for the label of a question, and saves its data model field before the layout', async () => {
    const user = userEvent.setup();
    const saveDataModel = vi.fn().mockImplementation(() => Promise.resolve());
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveDataModel, saveFormLayout });

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('Input'));
    await user.type(getLabelField(), 'Første ønske{Enter}');

    expect(saveDataModel.mock.calls[0][3].properties.forsteOnske).toEqual({ type: 'string' });
    expect(saveDataModel.mock.invocationCallOrder[0]).toBeLessThan(
      saveFormLayout.mock.invocationCallOrder[0],
    );
    expect(getSavedComponents(saveFormLayout).at(-1)).toMatchObject({
      type: 'Input',
      dataModelBindings: { simpleBinding: { field: 'forsteOnske', dataType: 'model' } },
    });
  });

  it('asks for the label when the user adds a question without one', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn();
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('Input'));
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.new_component.add') }),
    );

    expect(
      screen.getByText(textMock('app_builder.new_component.label_missing')),
    ).toBeInTheDocument();
    expect(getLabelField()).toHaveFocus();
    expect(saveFormLayout).not.toHaveBeenCalled();
  });

  it('names the field the answer is saved in after the label, once there is one', async () => {
    const user = userEvent.setup();
    renderPageCanvas();

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('Input'));
    const savedAs = (fieldName: string): string =>
      textMock('app_builder.new_component.saved_as', { fieldName });
    expect(screen.queryByText(savedAs('input'))).not.toBeInTheDocument();
    expect(
      screen.getByText(textMock('app_builder.new_component.saved_as_pending')),
    ).toBeInTheDocument();

    await user.type(getLabelField(), 'Etternavn');
    expect(screen.getByText(savedAs('etternavn'))).toBeInTheDocument();
  });

  it('does not save the layout when the data model cannot be saved', async () => {
    const user = userEvent.setup();
    const saveDataModel = vi.fn().mockImplementation(() => Promise.reject(new Error('failed')));
    const saveFormLayout = vi.fn();
    renderPageCanvas({}, { saveDataModel, saveFormLayout });

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('Input'));
    await user.type(getLabelField(), 'Fornavn{Enter}');

    expect(saveFormLayout).not.toHaveBeenCalled();
    expect(getLabelField()).toBeInTheDocument();
  });

  it('creates the yes or no code list for new radio buttons when the app does not have it', async () => {
    const user = userEvent.setup();
    const updateOptionList = vi.fn().mockImplementation(() => Promise.resolve([]));
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { updateOptionList, saveFormLayout });

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('RadioButtons'));
    await user.type(getLabelField(), 'Har du foreldreansvar alene?{Enter}');

    expect(updateOptionList).toHaveBeenCalledWith(org, app, 'janei', expect.any(Array));
    expect(getSavedComponents(saveFormLayout).at(-1)).toMatchObject({ optionsId: 'janei' });
  });

  it('adds radio buttons with the options typed in the add box, one after the other', async () => {
    const user = userEvent.setup();
    const updateOptionList = vi.fn();
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { updateOptionList, upsertTextResources, saveFormLayout });

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('RadioButtons'));
    await user.type(getLabelField(), 'Hva gjelder søknaden?');
    await user.click(
      screen.getByRole('radio', { name: textMock('app_builder.new_component.options_own') }),
    );
    for (const [index, option] of ['Ny tillatelse', 'Fornyelse', 'Flytting'].entries()) {
      const field = getNewOptionField(index + 1);
      expect(field).toHaveFocus();
      await user.type(field, option);
      await user.keyboard('{Enter}');
    }
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.new_component.add') }),
    );
    await screen.findByText('Hva gjelder søknaden?', { selector: '[role="textbox"]' });

    expect(updateOptionList).not.toHaveBeenCalled();
    const radioButtons = getSavedComponents(saveFormLayout).at(-1);
    expect(radioButtons).not.toHaveProperty('optionsId');
    expect(radioButtons.options).toHaveLength(3);
    expect(upsertTextResources).toHaveBeenCalledWith(
      org,
      app,
      'nb',
      expect.objectContaining({ [radioButtons.options[2].label]: 'Flytting' }),
    );
  });

  it('adds a question with the description written in the add box', async () => {
    const user = userEvent.setup();
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { upsertTextResources, saveFormLayout });

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('Input'));
    await user.type(getLabelField(), 'Registreringsnummer');
    await user.type(
      // The name ends with the tag that marks the field as optional.
      screen.getByRole('textbox', {
        name: (name) => name.startsWith(textMock('app_builder.new_component.description')),
      }),
      'For eksempel AB 12345',
    );
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.new_component.add') }),
    );

    const descriptionKey =
      getSavedComponents(saveFormLayout).at(-1).textResourceBindings.description;
    expect(upsertTextResources).toHaveBeenCalledWith(
      org,
      app,
      'nb',
      expect.objectContaining({ [descriptionKey]: 'For eksempel AB 12345' }),
    );
  });

  it('creates the attachment data type of a new file upload', async () => {
    const user = userEvent.setup();
    const addAppAttachmentMetadata = vi.fn().mockImplementation(() => Promise.resolve());
    const saveDataModel = vi.fn();
    renderPageCanvas({ taskId: 'Task_1' }, { addAppAttachmentMetadata, saveDataModel });

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('FileUpload'));
    await user.type(getLabelField(), 'Sakkyndig vurdering{Enter}');

    expect(addAppAttachmentMetadata).toHaveBeenCalledWith(
      org,
      app,
      expect.objectContaining({ taskId: 'Task_1', maxCount: 1, fileType: '' }),
    );
    expect(saveDataModel).not.toHaveBeenCalled();
  });
});

describe('PageCanvas, submit button', () => {
  it('adds a submit button to a page', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('Button'));

    expect(getSavedComponents(saveFormLayout).at(-1)).toMatchObject({ type: ComponentType.Button });
  });
});

describe('PageCanvas, deleting components', () => {
  it('asks what to remove with the component before it is deleted', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getSelectButton(nbTexts['reason.title']));
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.delete_component') }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: textMock('general.delete') }));

    expect(getSavedIds(saveFormLayout)).toEqual(['heading', 'choice', 'map']);
  });

  it('keeps texts that the builder did not make for the component', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const updateTextId = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout, updateTextId });

    await user.click(getSelectButton(nbTexts['reason.title']));
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.delete_component') }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: textMock('general.delete') }));

    await waitFor(() => expect(getSavedIds(saveFormLayout)).toEqual(['heading', 'choice', 'map']));
    expect(updateTextId).not.toHaveBeenCalled();
  });

  it('deletes nothing when the pages of the app could not be loaded', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const getFormLayouts = vi.fn().mockImplementation(() => Promise.reject(new Error('failed')));
    renderPageCanvas({}, { saveFormLayout, getFormLayouts }, {}, { otherLayoutSet: true });

    await user.click(getSelectButton(nbTexts['reason.title']));
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.delete_component') }),
    );
    const dialog = await screen.findByRole('dialog');

    expect(
      await within(dialog).findByText(textMock('app_builder.delete.load_error')),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: textMock('general.delete') }),
    ).not.toBeInTheDocument();
    expect(saveFormLayout).not.toHaveBeenCalled();
  });
});

describe('PageCanvas, navigation buttons', () => {
  const twoPages: PageLayouts = { ...defaultLayouts, side2: createLayout([]) };

  it('offers to add Previous and Next to a page that does not have them', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({ layouts: twoPages }, { saveFormLayout });

    expect(screen.getByText(textMock('app_builder.navigation.missing'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: textMock('app_builder.navigation.add') }));

    expect(saveFormLayout).toHaveBeenCalledTimes(1);
    expect(getSavedComponents(saveFormLayout).at(-1)).toMatchObject({
      type: ComponentType.NavigationButtons,
    });
  });

  it('does not change the page when it is only opened', () => {
    const saveFormLayout = vi.fn();
    renderPageCanvas({ layouts: twoPages }, { saveFormLayout });
    expect(saveFormLayout).not.toHaveBeenCalled();
  });
});

describe('PageCanvas, review fixes', () => {
  const navigation: LayoutComponent = { id: 'nav', type: ComponentType.NavigationButtons };

  it('adds a component above Previous and Next', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas(
      { layouts: { [pageName]: createLayout([heading, navigation]), side2: createLayout([]) } },
      { saveFormLayout },
    );

    await user.click(getAddComponentButton());
    await user.click(getComponentTypeButton('Paragraph'));

    expect(getSavedComponents(saveFormLayout).map(({ type }) => type)).toEqual([
      ComponentType.Heading,
      ComponentType.Paragraph,
      ComponentType.NavigationButtons,
    ]);
  });

  it('treats a page with a summary as a content page unless it is the last page', () => {
    const summaryInTheMiddle = createLayout([
      heading,
      { id: 'summary', type: ComponentType.Summary2 },
      { id: 'submit', type: ComponentType.Button, textResourceBindings: { title: 'submit.title' } },
    ]);
    renderPageCanvas(
      { layouts: { [pageName]: summaryInTheMiddle, side2: createLayout([]) } },
      {},
      { 'submit.title': 'Send inn' },
    );
    expect(screen.queryByText(textMock('app_builder.summary.kicker'))).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: textMock('app_builder.select_component', { componentName: 'Send inn' }),
      }),
    ).toBeInTheDocument();
  });

  it('does not save a maximum number of files that is empty or 0', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const fileUpload: LayoutComponent = {
      id: 'upload',
      type: ComponentType.FileUpload,
      textResourceBindings: { title: 'upload.title' },
      maxNumberOfAttachments: 3,
      maxFileSizeInMB: 25,
    };
    renderPageCanvas(
      { layouts: { [pageName]: createLayout([fileUpload]) } },
      { saveFormLayout },
      {
        'upload.title': 'Vedlegg',
      },
    );

    await user.click(getSelectButton('Vedlegg'));
    await user.click(screen.getByRole('button', { name: textMock('app_builder.more_settings') }));
    const maxFiles = screen.getByRole('textbox', {
      name: textMock('app_builder.settings.max_file_count'),
    });
    await user.clear(maxFiles);
    await user.type(maxFiles, '0');
    await user.tab();

    expect(screen.getByText(textMock('app_builder.settings.number_invalid'))).toBeInTheDocument();
    expect(saveFormLayout).not.toHaveBeenCalled();
  });

  it('keeps the delete dialog open when a later step fails', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const updateTextId = vi.fn().mockImplementation(() => Promise.reject(new Error('failed')));
    // Only texts named the way the builder names them are deleted with the component.
    const builderReason = { ...reason, textResourceBindings: { title: 'side1.reason.title' } };
    renderPageCanvas(
      { layouts: { [pageName]: createLayout([heading, builderReason]) } },
      { saveFormLayout, updateTextId },
      { 'side1.reason.title': 'Begrunnelse fra byggeren' },
    );

    await user.click(getSelectButton('Begrunnelse fra byggeren'));
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.delete_component') }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(
      await within(dialog).findByRole('button', { name: textMock('general.delete') }),
    );

    await waitFor(() => expect(updateTextId).toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('PageCanvas, deleting a page', () => {
  it('removes the attachment type of a file upload, and deletes the page last', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const deleteAppAttachmentMetadata = vi.fn().mockImplementation(() => Promise.resolve());
    const deletePage = vi.fn().mockImplementation(() => Promise.resolve());
    const fileUpload: LayoutComponent = { id: 'upload', type: ComponentType.FileUpload };
    renderPageCanvas(
      {
        layouts: {
          [pageName]: createLayout([heading, fileUpload]),
          side2: createLayout([]),
        },
      },
      { saveFormLayout, deleteAppAttachmentMetadata, deletePage },
    );

    await user.click(screen.getByRole('button', { name: textMock('app_builder.page.settings') }));
    await user.click(screen.getByRole('button', { name: textMock('app_builder.page.delete') }));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(textMock('app_builder.delete.attachments')),
    ).toBeInTheDocument();
    await user.click(
      await within(dialog).findByRole('button', { name: textMock('general.delete') }),
    );

    await waitFor(() => expect(deletePage).toHaveBeenCalledWith(org, app, layoutSetName, pageName));
    expect(deleteAppAttachmentMetadata).toHaveBeenCalledWith(org, app, 'upload');
    expect(saveFormLayout.mock.invocationCallOrder[0]).toBeLessThan(
      deletePage.mock.invocationCallOrder[0],
    );
  });
});

describe('PageCanvas, summary page', () => {
  it('shows a section for each page, and the text on the submit button', () => {
    const summaryLayout = createLayout([
      { id: 'summary', type: ComponentType.Summary2, target: { type: 'layoutSet' } },
      { id: 'submit', type: ComponentType.Button, textResourceBindings: { title: 'submit.title' } },
    ]);
    renderPageCanvas(
      {
        pageName: 'oppsummering',
        layouts: { ...defaultLayouts, oppsummering: summaryLayout },
        summaryPageName: 'oppsummering',
      },
      {},
      { 'submit.title': 'Send inn søknaden' },
    );

    expect(screen.getByRole('heading', { name: nbTexts[pageName] })).toBeInTheDocument();
    expect(screen.getByText('Send inn søknaden')).toBeInTheDocument();
  });

  it('deletes the summary page when the user confirms', async () => {
    const user = userEvent.setup();
    const deletePage = vi.fn().mockImplementation(() => Promise.resolve());
    const summaryLayout = createLayout([{ id: 'summary', type: ComponentType.Summary2 }]);
    renderPageCanvas(
      {
        pageName: 'oppsummering',
        layouts: { ...defaultLayouts, oppsummering: summaryLayout },
        summaryPageName: 'oppsummering',
      },
      { deletePage },
    );

    await user.click(screen.getByRole('button', { name: textMock('app_builder.page.settings') }));
    await user.click(screen.getByRole('button', { name: textMock('app_builder.page.delete') }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      await within(dialog).findByRole('button', { name: textMock('general.delete') }),
    );

    expect(deletePage).toHaveBeenCalledWith(org, app, layoutSetName, 'oppsummering');
  });
});

const getSelectButton = (componentName: string): HTMLElement =>
  screen.getByRole('button', { name: textMock('app_builder.select_component', { componentName }) });

const getToolbar = (): HTMLElement =>
  screen.getByRole('toolbar', { name: textMock('app_builder.component_toolbar') });

const queryToolbar = (): HTMLElement | null =>
  screen.queryByRole('toolbar', { name: textMock('app_builder.component_toolbar') });

const getEditableText = (text: string): HTMLElement =>
  screen.getByText(text, { selector: '[role="textbox"]' });

// The tag after the label of the only required field, drawn by the shared form component.
const getRequiredTag = (): HTMLElement =>
  screen.getByText(getLanguageFromCode('nb')['form_filler.required_label']);

const getAddComponentButton = (): HTMLElement =>
  screen.getByRole('button', { name: textMock('app_builder.add_component') });

const getComponentTypeButton = (type: string): HTMLElement =>
  screen.getByRole('button', { name: textMock(`app_builder.component_type.${type}`) });

// The name ends with the tag that marks the label as required.
const getLabelField = (): HTMLElement =>
  screen.getByRole('textbox', {
    name: (name) => name.startsWith(textMock('app_builder.new_component.label')),
  });

const getNewOptionField = (number: number): HTMLElement =>
  screen.getByRole('textbox', { name: textMock('app_builder.new_component.option', { number }) });

const getSavedComponents = (saveFormLayout: ReturnType<typeof vi.fn>): LayoutComponent[] =>
  saveFormLayout.mock.calls.at(-1)[4].layout.data.layout;

const getSavedIds = (saveFormLayout: ReturnType<typeof vi.fn>): string[] =>
  getSavedComponents(saveFormLayout).map(({ id }) => id);

const getSavedComponent = (
  saveFormLayout: ReturnType<typeof vi.fn>,
  componentId: string,
): LayoutComponent => getSavedComponents(saveFormLayout).find(({ id }) => id === componentId);

type RenderOptions = Partial<PageCanvasProps> & {
  layouts?: PageLayouts;
  summaryPageName?: string;
  taskId?: string;
};

// Reads the layouts and texts from the query cache, like the app builder does, so saves show.
function TestAppBuilder({
  layouts: _layouts,
  summaryPageName,
  taskId,
  layoutSetNames = [layoutSetName],
  ...props
}: RenderOptions & { layoutSetNames?: string[] }) {
  const { data: layouts } = usePageLayoutsQuery(org, app, layoutSetName);
  const { data: textResources } = useTextResourcesQuery(org, app);
  const pageNames = Object.keys(layouts).filter((name) => name !== summaryPageName);
  return (
    <AppBuilderProvider
      org={org}
      app={app}
      layoutSetName={layoutSetName}
      layoutSetNames={layoutSetNames}
      taskId={taskId}
      layouts={layouts}
      contentPageNames={pageNames}
      summaryPageName={summaryPageName}
      texts={getTextsById(textResources, 'nb')}
      dataModel={dataModel}
      codeLists={[]}
    >
      <PageCanvas pageName={pageName} onSelectPage={vi.fn()} onPageDeleted={vi.fn()} {...props} />
    </AppBuilderProvider>
  );
}

function renderPageCanvas(
  options: RenderOptions = {},
  services: Partial<ServicesContextProps> = {},
  extraTexts: Record<string, string> = {},
  { otherLayoutSet = false }: { otherLayoutSet?: boolean } = {},
) {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.AppBuilderFormLayouts, org, app, layoutSetName],
    options.layouts ?? defaultLayouts,
  );
  // Acts as the backend for the pages, so pages loaded again after a save are the saved ones.
  let savedLayouts: PageLayouts = options.layouts ?? defaultLayouts;
  const backend: Partial<ServicesContextProps> = {
    getFormLayouts: vi
      .fn()
      .mockImplementation((_org: string, _app: string, setName: string) =>
        Promise.resolve(setName === layoutSetName ? savedLayouts : {}),
      ),
    saveFormLayout: vi.fn((...args: Parameters<ServicesContextProps['saveFormLayout']>) => {
      const [, , savedPageName, , payload] = args;
      savedLayouts = { ...savedLayouts, [savedPageName]: payload.layout as PageLayout };
      return services.saveFormLayout?.(...args) ?? Promise.resolve();
    }),
    deletePage: vi.fn((...args: Parameters<ServicesContextProps['deletePage']>) => {
      const { [args[3]]: _deleted, ...remaining } = savedLayouts;
      savedLayouts = remaining;
      return services.deletePage?.(...args) ?? Promise.resolve();
    }),
  };
  const textResources: ITextResources = {
    nb: Object.entries({ ...nbTexts, ...extraTexts }).map(([id, value]) => ({ id, value })),
  };
  queryClient.setQueryData([QueryKey.TextResources, org, app], textResources);
  return render(
    <ServicesContextProvider
      {...queriesMock}
      {...services}
      getFormLayouts={services.getFormLayouts ?? backend.getFormLayouts}
      saveFormLayout={backend.saveFormLayout}
      deletePage={backend.deletePage}
      client={queryClient}
    >
      <TestAppBuilder
        {...options}
        // The other layout set is not in the cache, so its pages are fetched.
        layoutSetNames={otherLayoutSet ? [layoutSetName, 'other'] : [layoutSetName]}
      />
    </ServicesContextProvider>,
  );
}
