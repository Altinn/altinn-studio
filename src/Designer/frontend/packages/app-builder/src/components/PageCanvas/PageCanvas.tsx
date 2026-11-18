import { Fragment, useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations/useUpsertTextResourceMutation';
import { EDITOR_LANGUAGE, TEXT_KEY_ATTRIBUTE } from '../../constants';
import type { LayoutComponent, PageLayout, PageLayouts, TextsById } from '../../types';
import { getFieldNames } from '../../utils/dataModelUtils';
import { getTopLevelComponents, moveComponent, setRequired } from '../../utils/layoutUtils';
import { canToggleRequired } from '../../utils/componentUtils';
import {
  createNewComponent,
  generateComponentId,
  isDataComponentType,
} from '../../utils/newComponentUtils';
import type { AddableComponentType } from '../../utils/newComponentUtils';
import { useAddComponent } from '../../hooks/useAddComponent';
import { useDeleteComponent } from '../../hooks/useDeleteComponent';
import type { DataModel } from '../../hooks/useDataModelQuery';
import { useSavePageLayoutMutation } from '../../hooks/useSavePageLayoutMutation';
import { CanvasStateProvider, useCanvasState } from '../CanvasState/CanvasStateContext';
import { ComponentPreview } from '../ComponentPreview/ComponentPreview';
import { DeleteComponentDialog } from '../DeleteComponentDialog/DeleteComponentDialog';
import type { DeleteSelection } from '../DeleteComponentDialog/DeleteComponentDialog';
import { EditableComponent } from '../EditableComponent/EditableComponent';
import type { RequiredToggle } from '../EditableComponent/EditableComponent';
import { EditorTranslatorProvider } from '../EditorTranslator/EditorTranslatorProvider';
import { FloatingTextEditor } from '../FloatingTextEditor/FloatingTextEditor';
import { InsertPoint } from '../InsertPoint/InsertPoint';
import { NewComponentForm } from '../NewComponentForm/NewComponentForm';
import type { NewComponentValues } from '../NewComponentForm/NewComponentForm';
import classes from './PageCanvas.module.css';

export type PageCanvasProps = {
  org: string;
  app: string;
  layoutSetName: string;
  /** All layout sets in the app, so deleting can check what other pages use. */
  layoutSetNames: string[];
  pageName: string;
  /** All pages in the layout set, so new component IDs are unique across them. */
  layouts: PageLayouts;
  texts: TextsById;
  /** The data model that new data components save to. Undefined when there is none. */
  dataModel?: DataModel;
};

export function PageCanvas(props: PageCanvasProps): ReactElement {
  return (
    <CanvasStateProvider>
      <EditorTranslatorProvider texts={props.texts}>
        <PageCanvasContent {...props} />
      </EditorTranslatorProvider>
    </CanvasStateProvider>
  );
}

type NewDataComponent = {
  type: AddableComponentType;
  position: number;
};

type ComponentToFocus = {
  componentId: string;
  shouldEditText: boolean;
};

function PageCanvasContent({
  org,
  app,
  layoutSetName,
  layoutSetNames,
  pageName,
  layouts,
  texts,
  dataModel,
}: PageCanvasProps): ReactElement {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { editingText, stopEditingText, selectComponent, startEditingText } = useCanvasState();
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);
  const { mutate: savePageLayout } = useSavePageLayoutMutation(org, app, layoutSetName);
  const layout: PageLayout = layouts[pageName];
  const addComponent = useAddComponent(org, app, layoutSetName, pageName, layout);
  const deleteComponent = useDeleteComponent(org, app, layoutSetName, pageName, layout, dataModel);

  const [openInsertPosition, setOpenInsertPosition] = useState<number>();
  const [newDataComponent, setNewDataComponent] = useState<NewDataComponent>();
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [componentToFocus, setComponentToFocus] = useState<ComponentToFocus>();
  const [componentToDelete, setComponentToDelete] = useState<LayoutComponent>();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const components = getTopLevelComponents(layout);

  // A new component is selected once it shows on the canvas, which is after it has been saved.
  useEffect(() => {
    if (!componentToFocus) return;
    const element = containerRef.current?.querySelector<HTMLElement>(
      `[data-component-id="${componentToFocus.componentId}"]`,
    );
    if (!element) return;
    selectComponent(componentToFocus.componentId);
    const textElement = element.querySelector<HTMLElement>(`[${TEXT_KEY_ATTRIBUTE}]`);
    if (componentToFocus.shouldEditText && textElement) {
      startEditingText({
        textKey: textElement.getAttribute(TEXT_KEY_ATTRIBUTE),
        anchor: textElement,
      });
    }
    setComponentToFocus(undefined);
  }, [componentToFocus, layout, selectComponent, startEditingText]);

  const handleMove = (componentId: string, offset: number): void =>
    savePageLayout({ pageName, layout: moveComponent(layout, componentId, offset) });

  const handleDelete = async (
    component: LayoutComponent,
    { textKeys, fieldNames }: DeleteSelection,
  ): Promise<void> => {
    setIsDeleting(true);
    const isDeleted = await deleteComponent({
      componentId: component.id,
      textKeysToDelete: textKeys,
      fieldNamesToDelete: fieldNames,
    });
    setIsDeleting(false);
    // The dialog stays open when a step fails, so the user sees that something went wrong.
    if (isDeleted) {
      selectComponent(undefined);
      setComponentToDelete(undefined);
    }
  };

  const getRequiredToggle = (component: LayoutComponent): RequiredToggle | undefined => {
    if (!canToggleRequired(component)) return undefined;
    const isRequired = component.required === true;
    return {
      isRequired,
      onToggle: () =>
        savePageLayout({ pageName, layout: setRequired(layout, component.id, !isRequired) }),
    };
  };

  const handleSaveText = (textKey: string, value: string): void => {
    stopEditingText();
    if (value !== (texts[textKey] ?? '')) {
      upsertTextResource({ textId: textKey, language: EDITOR_LANGUAGE, translation: value });
    }
  };

  const handleChooseType = (type: AddableComponentType, position: number): void => {
    setOpenInsertPosition(undefined);
    if (isDataComponentType(type)) {
      setNewDataComponent({ type, position });
    } else {
      void addDisplayComponent(type, position);
    }
  };

  // Headings and paragraphs are added straight away with a text the user can change in place.
  const addDisplayComponent = async (
    type: AddableComponentType,
    position: number,
  ): Promise<void> => {
    const componentId = generateComponentId(type, layouts);
    const { component, texts: newTexts } = createNewComponent({
      type,
      componentId,
      pageName,
      text: t(`app_builder.default_text.${type}`),
    });
    const isAdded = await addComponent({ component, texts: newTexts, position });
    if (isAdded) setComponentToFocus({ componentId, shouldEditText: true });
  };

  const addDataComponent = async (
    { type, position }: NewDataComponent,
    { label, fieldName, required }: NewComponentValues,
  ): Promise<void> => {
    const componentId = generateComponentId(type, layouts);
    const binding =
      dataModel && fieldName ? { field: fieldName, dataType: dataModel.dataType } : undefined;
    const { component, texts: newTexts } = createNewComponent({
      type,
      componentId,
      pageName,
      text: label,
      optionTexts: [
        t('app_builder.default_text.option', { number: 1 }),
        t('app_builder.default_text.option', { number: 2 }),
      ],
      required,
      binding,
    });
    const newField = binding ? { name: fieldName, dataModel } : undefined;
    setIsAdding(true);
    const isAdded = await addComponent({ component, texts: newTexts, position, newField });
    setIsAdding(false);
    // The form stays open when a save fails, so the user can try again.
    if (isAdded) {
      setNewDataComponent(undefined);
      setComponentToFocus({ componentId, shouldEditText: false });
    }
  };

  const renderInsertPoint = (position: number, isAlwaysVisible: boolean): ReactElement => {
    if (newDataComponent?.position === position) {
      return (
        <NewComponentForm
          type={newDataComponent.type}
          hasDataModel={Boolean(dataModel)}
          takenFieldNames={getFieldNames(dataModel?.schema)}
          isSaving={isAdding}
          onAdd={(values) => void addDataComponent(newDataComponent, values)}
          onCancel={() => setNewDataComponent(undefined)}
        />
      );
    }
    return (
      <InsertPoint
        isOpen={openInsertPosition === position}
        isAlwaysVisible={isAlwaysVisible}
        onOpen={() => {
          setNewDataComponent(undefined);
          setOpenInsertPosition(position);
        }}
        onClose={() => setOpenInsertPosition(undefined)}
        onChooseType={(type) => handleChooseType(type, position)}
      />
    );
  };

  return (
    <div ref={containerRef} className={classes.pageCanvas}>
      {components.length === 0 && (
        <p className={classes.emptyPage}>{t('app_builder.empty_page')}</p>
      )}
      {components.map((component, index) => (
        <Fragment key={component.id}>
          {renderInsertPoint(index, false)}
          <EditableComponent
            componentId={component.id}
            canMoveUp={index > 0}
            canMoveDown={index < components.length - 1}
            onMove={(offset) => handleMove(component.id, offset)}
            onDelete={() => setComponentToDelete(component)}
            requiredToggle={getRequiredToggle(component)}
          >
            <ComponentPreview component={component} />
          </EditableComponent>
        </Fragment>
      ))}
      {renderInsertPoint(components.length, true)}
      {componentToDelete && (
        <DeleteComponentDialog
          org={org}
          app={app}
          layoutSetName={layoutSetName}
          layoutSetNames={layoutSetNames}
          component={componentToDelete}
          texts={texts}
          dataModel={dataModel}
          isDeleting={isDeleting}
          onDelete={(selection) => void handleDelete(componentToDelete, selection)}
          onClose={() => setComponentToDelete(undefined)}
        />
      )}
      {editingText && containerRef.current && (
        <FloatingTextEditor
          key={editingText.textKey}
          anchor={editingText.anchor}
          container={containerRef.current}
          value={texts[editingText.textKey] ?? ''}
          label={t('app_builder.edit_text')}
          onSave={(value) => handleSaveText(editingText.textKey, value)}
          onCancel={stopEditingText}
        />
      )}
    </div>
  );
}
