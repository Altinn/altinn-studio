import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { getLanguageFromCode } from '@app/language';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { JsonSchema } from 'app-shared/types/JsonSchema';
import type { LayoutComponent, PageLayout, TextsById } from '../../types';
import type { DataModel } from '../../hooks/useDataModelQuery';
import { usePageLayoutsQuery } from '../../hooks/usePageLayoutsQuery';
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
const textArea: LayoutComponent = {
  id: 'reason',
  type: ComponentType.TextArea,
  textResourceBindings: { title: 'reason.title' },
};
const map: LayoutComponent = { id: 'map', type: ComponentType.Map };

const layout: PageLayout = { $schema: 'schema', data: { layout: [heading, textArea, map] } };
const texts: TextsById = {
  'heading.title': 'Søknad om parkering',
  'reason.title': 'Begrunnelse',
};

const schema: JsonSchema = { type: 'object', properties: { fornavn: { type: 'string' } } };
const dataModel: DataModel = {
  dataType: 'model',
  modelPath: '/App/models/model.schema.json',
  schema,
};

describe('PageCanvas', () => {
  it('renders the supported components with their texts', () => {
    renderPageCanvas();
    expect(screen.getByRole('heading', { name: texts['heading.title'] })).toBeInTheDocument();
    // The shared label also shows the optional marker, as in the app.
    const textAreaName = new RegExp(`^${texts['reason.title']}`);
    expect(screen.getByRole('textbox', { name: textAreaName })).toBeInTheDocument();
  });

  it('shows a placeholder for a component type that cannot be shown yet', () => {
    renderPageCanvas();
    const message = textMock('app_builder.unsupported_component', { componentType: 'Map' });
    expect(screen.getByText(message)).toBeInTheDocument();
  });

  it('tells the user when the page has no components', () => {
    renderPageCanvas({ layouts: { [pageName]: { $schema: 'schema', data: { layout: [] } } } });
    expect(screen.getByText(textMock('app_builder.empty_page'))).toBeInTheDocument();
  });

  it('selects a component when it is clicked', async () => {
    const user = userEvent.setup();
    renderPageCanvas();
    await user.click(getSelectButton(textArea.id));
    expect(getEditTextButton(textArea.id)).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('saves an edited text when Enter is pressed', async () => {
    const user = userEvent.setup();
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    renderPageCanvas({}, { upsertTextResources });

    await user.click(getSelectButton(textArea.id));
    getEditTextButton(textArea.id).focus();
    await user.keyboard('{Enter}');
    const textEditor = screen.getByRole('textbox', { name: textMock('app_builder.edit_text') });
    await user.clear(textEditor);
    await user.type(textEditor, 'Hvorfor søker du?{Enter}');

    expect(upsertTextResources).toHaveBeenCalledTimes(1);
    expect(upsertTextResources).toHaveBeenCalledWith(org, app, 'nb', {
      'reason.title': 'Hvorfor søker du?',
    });
  });

  it('does not save a text when Escape is pressed', async () => {
    const user = userEvent.setup();
    const upsertTextResources = vi.fn();
    renderPageCanvas({}, { upsertTextResources });

    await user.click(getSelectButton(textArea.id));
    getEditTextButton(textArea.id).focus();
    await user.keyboard('{Enter}');
    await user.type(screen.getByRole('textbox', { name: textMock('app_builder.edit_text') }), 'x');
    await user.keyboard('{Escape}');

    expect(upsertTextResources).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('textbox', { name: textMock('app_builder.edit_text') }),
    ).not.toBeInTheDocument();
  });

  it('saves the page with the component moved down', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getSelectButton(heading.id));
    await user.click(screen.getByRole('button', { name: textMock('app_builder.move_down') }));

    expect(saveFormLayout).toHaveBeenCalledTimes(1);
    const [, , savedPageName, savedLayoutSetName, { layout: savedLayout }] =
      saveFormLayout.mock.calls[0];
    expect(savedPageName).toBe(pageName);
    expect(savedLayoutSetName).toBe(layoutSetName);
    expect(savedLayout.data.layout.map(({ id }) => id)).toEqual([textArea.id, heading.id, map.id]);
  });

  it('cannot move the first component up', async () => {
    const user = userEvent.setup();
    renderPageCanvas();
    await user.click(getSelectButton(heading.id));
    expect(screen.getByRole('button', { name: textMock('app_builder.move_up') })).toBeDisabled();
  });
});

describe('PageCanvas, adding components', () => {
  it('adds a heading at the end of the page and opens its text for editing', async () => {
    const user = userEvent.setup();
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { upsertTextResources, saveFormLayout });

    await user.click(getLastAddButton());
    await user.click(getComponentTypeButton('Heading'));

    const [, , language, savedTexts] = upsertTextResources.mock.calls[0];
    expect(language).toBe('nb');
    expect(Object.values(savedTexts)).toEqual([textMock('app_builder.default_text.Heading')]);
    const savedComponents = getSavedLayoutComponents(saveFormLayout);
    expect(savedComponents).toHaveLength(4);
    expect(savedComponents.at(-1)).toMatchObject({ type: 'Heading', size: 'L' });
    expect(
      await screen.findByRole('textbox', { name: textMock('app_builder.edit_text') }),
    ).toBeInTheDocument();
  });

  it('adds an input with a data model field named after its label', async () => {
    const user = userEvent.setup();
    const saveDataModel = vi.fn().mockImplementation(() => Promise.resolve());
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveDataModel, upsertTextResources, saveFormLayout });

    await user.click(getLastAddButton());
    await user.click(getComponentTypeButton('Input'));
    await user.type(getLabelField(), 'Første ønske');
    expect(
      screen.getByText(
        textMock('app_builder.new_component.saved_as', { fieldName: 'forsteOnske' }),
      ),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole('checkbox', { name: textMock('app_builder.new_component.required') }),
    );
    await user.click(getAddButton());

    const [, , modelPath, savedSchema] = saveDataModel.mock.calls[0];
    expect(modelPath).toBe(dataModel.modelPath);
    expect(savedSchema.properties).toEqual({
      fornavn: { type: 'string' },
      forsteOnske: { type: 'string' },
    });
    expect(Object.values(upsertTextResources.mock.calls[0][3])).toEqual(['Første ønske']);
    expect(getSavedLayoutComponents(saveFormLayout).at(-1)).toMatchObject({
      type: 'Input',
      required: true,
      dataModelBindings: { simpleBinding: { field: 'forsteOnske', dataType: 'model' } },
    });
  });

  it('saves the data model and the texts before the layout', async () => {
    const user = userEvent.setup();
    const saveDataModel = vi.fn().mockImplementation(() => Promise.resolve());
    const upsertTextResources = vi.fn().mockImplementation(() => Promise.resolve({}));
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveDataModel, upsertTextResources, saveFormLayout });

    await user.click(getLastAddButton());
    await user.click(getComponentTypeButton('TextArea'));
    await user.type(getLabelField(), 'Begrunnelse{Enter}');

    const layoutOrder = saveFormLayout.mock.invocationCallOrder[0];
    expect(saveDataModel.mock.invocationCallOrder[0]).toBeLessThan(layoutOrder);
    expect(upsertTextResources.mock.invocationCallOrder[0]).toBeLessThan(layoutOrder);
  });

  it('does not save the layout when the data model cannot be saved', async () => {
    const user = userEvent.setup();
    const saveDataModel = vi.fn().mockImplementation(() => Promise.reject(new Error('failed')));
    const saveFormLayout = vi.fn();
    renderPageCanvas({}, { saveDataModel, saveFormLayout });

    await user.click(getLastAddButton());
    await user.click(getComponentTypeButton('Input'));
    await user.type(getLabelField(), 'Fornavn{Enter}');

    expect(saveDataModel).toHaveBeenCalledTimes(1);
    expect(saveFormLayout).not.toHaveBeenCalled();
    expect(getLabelField()).toBeInTheDocument();
  });

  it('suggests another field name when the name is taken', async () => {
    const user = userEvent.setup();
    renderPageCanvas();

    await user.click(getLastAddButton());
    await user.click(getComponentTypeButton('Input'));
    await user.type(getLabelField(), 'Fornavn');

    expect(
      screen.getByText(textMock('app_builder.new_component.saved_as', { fieldName: 'fornavn2' })),
    ).toBeInTheDocument();
  });

  it('does not add the component when the field name is not valid', async () => {
    const user = userEvent.setup();
    renderPageCanvas();

    await user.click(getLastAddButton());
    await user.click(getComponentTypeButton('Input'));
    await user.type(getLabelField(), 'Fornavn');
    await user.click(
      screen.getByRole('button', { name: textMock('app_builder.new_component.change_field_name') }),
    );
    const fieldNameField = screen.getByRole('textbox', {
      name: textMock('app_builder.new_component.field_name'),
    });
    await user.clear(fieldNameField);
    await user.type(fieldNameField, '2fornavn');

    expect(fieldNameField).toHaveAccessibleDescription(
      textMock('app_builder.new_component.field_name_invalid', { fieldName: '2fornavn' }),
    );
    expect(getAddButton()).toBeDisabled();
  });

  it('adds a data component without a field when there is no data model', async () => {
    const user = userEvent.setup();
    const saveDataModel = vi.fn();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({ dataModel: undefined }, { saveDataModel, saveFormLayout });

    await user.click(getLastAddButton());
    await user.click(getComponentTypeButton('Input'));
    expect(
      screen.getByText(textMock('app_builder.new_component.no_data_model')),
    ).toBeInTheDocument();
    await user.type(getLabelField(), 'Fornavn{Enter}');

    expect(saveDataModel).not.toHaveBeenCalled();
    expect(getSavedLayoutComponents(saveFormLayout).at(-1)).not.toHaveProperty('dataModelBindings');
  });

  it('closes the form without saving when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn();
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getLastAddButton());
    await user.click(getComponentTypeButton('Input'));
    await user.click(screen.getByRole('button', { name: textMock('general.cancel') }));

    expect(
      screen.queryByRole('textbox', { name: textMock('app_builder.new_component.label') }),
    ).not.toBeInTheDocument();
    expect(saveFormLayout).not.toHaveBeenCalled();
  });
});

describe('PageCanvas, deleting components', () => {
  const nameInput: LayoutComponent = {
    id: 'name',
    type: ComponentType.Input,
    textResourceBindings: { title: 'name.title' },
    dataModelBindings: { simpleBinding: { field: 'fornavn', dataType: 'model' } },
  };
  const layoutWithInput: PageLayout = {
    $schema: 'schema',
    data: { layout: [heading, nameInput] },
  };
  const textsWithInput: TextsById = { ...texts, 'name.title': 'Fornavn' };
  const published = {
    pipelineDeploymentList: [],
    kubernetesDeploymentList: [{ envName: 'tt02', release: '', version: '1' }],
  };
  const notPublished = { pipelineDeploymentList: [], kubernetesDeploymentList: [] };

  const openDeleteDialog = async (
    user: ReturnType<typeof userEvent.setup>,
    componentId: string,
  ) => {
    await user.click(getSelectButton(componentId));
    await user.click(screen.getByRole('button', { name: textMock('general.delete') }));
    return screen.findByRole('checkbox', {
      name: textMock('app_builder.delete.texts', { count: 1 }),
    });
  };

  it('deletes the component and the texts only it uses', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const updateTextId = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout, updateTextId });

    const textsCheckbox = await openDeleteDialog(user, textArea.id);
    expect(textsCheckbox).toBeChecked();
    await user.click(getDialogDeleteButton());

    const [, , , , request] = saveFormLayout.mock.calls[0];
    expect(request.layout.data.layout.map(({ id }) => id)).toEqual([heading.id, map.id]);
    expect(request.componentIdsChange).toEqual([
      { oldComponentId: textArea.id, newComponentId: undefined },
    ]);
    expect(updateTextId).toHaveBeenCalledWith(org, app, [{ oldId: 'reason.title' }]);
    expect(saveFormLayout.mock.invocationCallOrder[0]).toBeLessThan(
      updateTextId.mock.invocationCallOrder[0],
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the texts when the user unchecks them', async () => {
    const user = userEvent.setup();
    const updateTextId = vi.fn();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout, updateTextId });

    await user.click(await openDeleteDialog(user, textArea.id));
    await user.click(getDialogDeleteButton());

    expect(saveFormLayout).toHaveBeenCalledTimes(1);
    expect(updateTextId).not.toHaveBeenCalled();
  });

  it('removes the data model field by default when the app has never been published', async () => {
    const user = userEvent.setup();
    const saveDataModel = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas(
      { layouts: { [pageName]: layoutWithInput }, texts: textsWithInput },
      { saveDataModel, getDeployments: vi.fn().mockResolvedValue(notPublished) },
    );

    await openDeleteDialog(user, nameInput.id);
    expect(getFieldCheckbox('fornavn')).toBeChecked();
    await user.click(getDialogDeleteButton());

    await waitFor(() => expect(saveDataModel).toHaveBeenCalledTimes(1));
    const [, , modelPath, savedSchema] = saveDataModel.mock.calls[0];
    expect(modelPath).toBe(dataModel.modelPath);
    expect(savedSchema.properties).toEqual({});
  });

  it('keeps the data model field by default when the app is published', async () => {
    const user = userEvent.setup();
    renderPageCanvas(
      { layouts: { [pageName]: layoutWithInput }, texts: textsWithInput },
      { getDeployments: vi.fn().mockResolvedValue(published) },
    );

    await openDeleteDialog(user, nameInput.id);

    expect(getFieldCheckbox('fornavn')).not.toBeChecked();
    expect(getFieldCheckbox('fornavn')).toHaveAccessibleDescription(
      textMock('app_builder.delete.field_may_have_answers'),
    );
  });

  it('does not delete anything when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn();
    renderPageCanvas({}, { saveFormLayout });

    await openDeleteDialog(user, textArea.id);
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: textMock('general.cancel') }),
    );

    expect(saveFormLayout).not.toHaveBeenCalled();
    expect(getEditTextButton(textArea.id)).toBeInTheDocument();
  });
});

const getDialogDeleteButton = (): HTMLElement =>
  within(screen.getByRole('dialog')).getByRole('button', { name: textMock('general.delete') });

const getFieldCheckbox = (fieldName: string): HTMLElement =>
  screen.getByRole('checkbox', { name: textMock('app_builder.delete.field', { fieldName }) });

describe('PageCanvas, required and optional', () => {
  afterEach(() => {
    delete (document as Partial<Document>).elementsFromPoint;
  });

  it('makes an optional field required with the toolbar button', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    renderPageCanvas({}, { saveFormLayout });

    await user.click(getSelectButton(textArea.id));
    const requiredButton = screen.getByRole('button', { name: textMock('app_builder.required') });
    expect(requiredButton).toHaveAttribute('aria-pressed', 'false');
    await user.click(requiredButton);

    const savedTextArea = getSavedLayoutComponents(saveFormLayout).find(
      ({ id }) => id === textArea.id,
    );
    expect(savedTextArea.required).toBe(true);
    expect(screen.getByRole('button', { name: textMock('app_builder.required') })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('makes a required field optional when its tag is clicked, also when it is not selected', async () => {
    const user = userEvent.setup();
    const saveFormLayout = vi.fn().mockImplementation(() => Promise.resolve());
    const requiredTextArea = { ...textArea, required: true };
    renderPageCanvas(
      {
        layouts: {
          [pageName]: { $schema: 'schema', data: { layout: [heading, requiredTextArea] } },
        },
      },
      { saveFormLayout },
    );
    pointAtElement(screen.getByText(nb['form_filler.required_label']));

    await user.click(getSelectButton(textArea.id));

    const savedTextArea = getSavedLayoutComponents(saveFormLayout).find(
      ({ id }) => id === textArea.id,
    );
    expect(savedTextArea).not.toHaveProperty('required');
    expect(screen.getByText(nb['general.optional'])).toBeInTheDocument();
  });

  it('does not offer the toggle when required is an expression', async () => {
    const user = userEvent.setup();
    const expressionTextArea = { ...textArea, required: ['equals', 1, 1] };
    renderPageCanvas({
      layouts: { [pageName]: { $schema: 'schema', data: { layout: [expressionTextArea] } } },
    });

    await user.click(getSelectButton(textArea.id));

    expect(
      screen.queryByRole('button', { name: textMock('app_builder.required') }),
    ).not.toBeInTheDocument();
  });
});

const nb = getLanguageFromCode('nb');

// jsdom has no layout, so the element under the pointer is set by hand.
function pointAtElement(element: HTMLElement): void {
  document.elementsFromPoint = vi.fn().mockReturnValue([element]);
}

const getLabelField = (): HTMLElement =>
  screen.getByRole('textbox', { name: textMock('app_builder.new_component.label') });

const getAddButton = (): HTMLElement =>
  screen.getByRole('button', { name: textMock('app_builder.new_component.add') });

const getSelectButton = (componentId: string): HTMLElement =>
  screen.getByRole('button', { name: textMock('app_builder.select_component', { componentId }) });

const getEditTextButton = (componentId: string): HTMLElement =>
  screen.getByRole('button', {
    name: textMock('app_builder.edit_component_text', { componentId }),
  });

const getLastAddButton = (): HTMLElement =>
  screen.getAllByRole('button', { name: textMock('app_builder.add_component_here') }).at(-1);

const getComponentTypeButton = (type: string): HTMLElement =>
  screen.getByRole('button', { name: textMock(`ux_editor.component_title.${type}`) });

const getSavedLayoutComponents = (saveFormLayout: ReturnType<typeof vi.fn>): LayoutComponent[] =>
  saveFormLayout.mock.calls[0][4].layout.data.layout;

const defaultProps: PageCanvasProps = {
  org,
  app,
  layoutSetName,
  layoutSetNames: [layoutSetName],
  pageName,
  layouts: { [pageName]: layout },
  texts,
  dataModel,
};

// Reads the layouts from the query cache, like the app builder does, so saved changes show.
function PageCanvasWithCachedLayouts(props: PageCanvasProps) {
  const { data: layouts } = usePageLayoutsQuery(org, app, layoutSetName);
  return <PageCanvas {...props} layouts={layouts} />;
}

function renderPageCanvas(
  props: Partial<PageCanvasProps> = {},
  services: Partial<ServicesContextProps> = {},
) {
  const queryClient = createQueryClientMock();
  const allProps = { ...defaultProps, ...props };
  queryClient.setQueryData(
    [QueryKey.AppBuilderFormLayouts, org, app, layoutSetName],
    allProps.layouts,
  );
  return render(
    <ServicesContextProvider {...queriesMock} {...services} client={queryClient}>
      <PageCanvasWithCachedLayouts {...allProps} />
    </ServicesContextProvider>,
  );
}
