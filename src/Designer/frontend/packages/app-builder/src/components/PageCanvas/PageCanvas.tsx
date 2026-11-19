import { Fragment, useEffect, useRef, useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { StudioButton } from '@designer/components';
import { PlusIcon } from '@designer/icons';
import { TEXT_KEY_ATTRIBUTE } from '../../constants';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useDeleteComponent } from '../../hooks/useDeleteComponent';
import type { LayoutComponent } from '../../types';
import { getComponentText } from '../../utils/componentUtils';
import { getFieldNames } from '../../utils/dataModelUtils';
import {
  findComponent,
  getChildComponents,
  getComponentAndDescendantIds,
  getTopLevelComponents,
  getWidth,
  isGroup,
} from '../../utils/layoutUtils';
import type { Placement } from '../../utils/layoutUtils';
import { AddComponentBox } from '../AddComponentBox/AddComponentBox';
import { CanvasStateProvider, useCanvasState } from '../CanvasState/CanvasStateContext';
import { ComponentPreview } from '../ComponentPreview/ComponentPreview';
import { DeleteDialog } from '../DeleteDialog/DeleteDialog';
import type { DeleteSelection } from '../DeleteDialog/DeleteDialog';
import { EditableComponent } from '../EditableComponent/EditableComponent';
import { EditorTranslatorProvider } from '../EditorTranslator/EditorTranslatorProvider';
import { InsertLine } from '../InsertLine/InsertLine';
import { NewComponentForm } from '../NewComponentForm/NewComponentForm';
import { PageEditingProvider, usePageEditing } from '../PageEditing/PageEditingContext';
import { ComponentSettingsPanel } from '../SettingsPanel/ComponentSettingsPanel';
import { PageSettingsPanel, SummarySettingsPanel } from '../SettingsPanel/PageSettingsPanel';
import { NavigationRow } from './NavigationRow';
import { PageHeading } from './PageHeading';
import { SummaryPreview } from './SummaryPreview';
import { useAddFlow } from './useAddFlow';
import type { AddFlow } from './useAddFlow';
import classes from './PageCanvas.module.css';

export type PageCanvasProps = {
  pageName: string;
  onSelectPage: (pageName: string) => void;
  /** Called after the page is deleted, so another page can be shown. */
  onPageDeleted: () => void;
};

export function PageCanvas(props: PageCanvasProps): ReactElement | null {
  const { texts, layouts } = useAppBuilder();
  // A deleted page is gone from the layouts before the builder has moved on to another page.
  if (!layouts[props.pageName]) return null;
  return (
    <CanvasStateProvider>
      <PageEditingProvider pageName={props.pageName}>
        <TextSaver>
          {(saveText) => (
            <EditorTranslatorProvider texts={texts} onSaveText={saveText}>
              <PageCanvasContent {...props} />
            </EditorTranslatorProvider>
          )}
        </TextSaver>
      </PageEditingProvider>
    </CanvasStateProvider>
  );
}

type TextSaverProps = {
  children: (saveText: (textKey: string, value: string) => void) => ReactElement;
};

function TextSaver({ children }: TextSaverProps): ReactElement {
  const { saveTexts } = usePageEditing();
  return children((textKey, value) => saveTexts({ [textKey]: value }));
}

const backgroundAttribute = 'data-canvas-background';

function PageCanvasContent({ onSelectPage, onPageDeleted }: PageCanvasProps): ReactElement {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { layout, fixedIds, isSummaryPage: isSummary } = usePageEditing();
  const canvasState = useCanvasState();
  const { selectComponent, openSettings, addPlacement, newQuestion } = canvasState;
  const addFlow = useAddFlow();
  const components = getTopLevelComponents(layout).filter(({ id }) => !fixedIds.has(id));

  useEscapeToDeselect(containerRef);
  useFocusAddedText(containerRef, addFlow);

  const handleBackgroundClick = (event: MouseEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).hasAttribute(backgroundAttribute)) selectComponent(undefined);
  };

  const background = { [backgroundAttribute]: '' };
  const isAddingAtEnd = [addPlacement, newQuestion?.placement].some(
    (placement) => placement?.kind === 'end',
  );

  return (
    <div
      ref={containerRef}
      className={classes.canvas}
      onClick={handleBackgroundClick}
      {...background}
    >
      <article className={classes.card} data-size='sm' {...background}>
        <PageHeading />
        {openSettings === 'page' &&
          (isSummary ? (
            <SummarySettingsPanel onPageDeleted={onPageDeleted} />
          ) : (
            <PageSettingsPanel onPageDeleted={onPageDeleted} />
          ))}
        {components.length > 0 ? (
          <ComponentGrid components={components} addFlow={addFlow} />
        ) : (
          <p className={classes.emptyPage}>{t('app_builder.empty_page')}</p>
        )}
        {isSummary && <SummaryPreview onSelectPage={onSelectPage} />}
        <NavigationRow />
        {isAddingAtEnd ? (
          <AddArea placement={{ kind: 'end' }} addFlow={addFlow} />
        ) : (
          <StudioButton
            variant='secondary'
            data-size='sm'
            icon={<PlusIcon />}
            className={classes.addButton}
            onClick={() => canvasState.openAddBox({ kind: 'end' })}
          >
            {t('app_builder.add_component')}
          </StudioButton>
        )}
      </article>
      <DeleteComponentDialog />
    </div>
  );
}

type ComponentGridProps = {
  components: LayoutComponent[];
  addFlow: AddFlow;
};

/** Components in two columns: a half-width field takes one, everything else both. */
function ComponentGrid({ components, addFlow }: ComponentGridProps): ReactElement {
  const { layout } = usePageEditing();
  const {
    selectedComponentId,
    openSettings,
    addPlacement,
    newQuestion,
    openAddBox,
    requestDelete,
  } = useCanvasState();

  const placements = [addPlacement, newQuestion?.placement];
  const isAddingBefore = (componentId: string): boolean =>
    placements.some((p) => p?.kind === 'before' && p.componentId === componentId);
  const isAddingInGroup = (groupId: string): boolean =>
    placements.some((p) => p?.kind === 'inGroup' && p.groupId === groupId);

  const renderInsertPoint = (placement: Placement, isAdding: boolean): ReactElement =>
    isAdding ? (
      <AddArea placement={placement} addFlow={addFlow} className={classes.fullWidth} />
    ) : (
      <InsertLine className={classes.fullWidth} onClick={() => openAddBox(placement)} />
    );

  const renderComponent = (component: LayoutComponent): ReactElement => {
    const before: Placement = { kind: 'before', componentId: component.id };
    const isAdding = isAddingBefore(component.id);
    return (
      <Fragment key={component.id}>
        {isAdding && <AddArea placement={before} addFlow={addFlow} className={classes.fullWidth} />}
        {/* The line sits in the component's cell, so two half-width fields stay side by side. */}
        <div
          className={cn(classes.cell, {
            [classes.fullWidth]: getWidth(component) !== 'half',
          })}
        >
          {!isAdding && (
            <InsertLine className={classes.cellInsertLine} onClick={() => openAddBox(before)} />
          )}
          <EditableComponent
            component={component}
            preview={
              <ComponentPreview
                component={component}
                isSelected={selectedComponentId === component.id}
              />
            }
            onDelete={() => requestDelete(component.id)}
          />
        </div>
        {selectedComponentId === component.id && openSettings === 'component' && (
          <div className={classes.fullWidth}>
            <ComponentSettingsPanel
              component={component}
              onDelete={() => requestDelete(component.id)}
            />
          </div>
        )}
        {isGroup(component) && (
          <div className={cn(classes.fullWidth, classes.groupChildren)}>
            {getChildComponents(layout, component).map(renderComponent)}
            {renderInsertPoint(
              { kind: 'inGroup', groupId: component.id },
              isAddingInGroup(component.id),
            )}
          </div>
        )}
      </Fragment>
    );
  };

  return (
    <div className={classes.grid} data-canvas-background=''>
      {components.map(renderComponent)}
    </div>
  );
}

type AddAreaProps = {
  placement: Placement;
  addFlow: AddFlow;
  className?: string;
};

/** The add box, or the label form once the user has chosen a question. */
function AddArea({ placement, addFlow, className }: AddAreaProps): ReactElement {
  const { t } = useTranslation();
  const { dataModel, texts } = useAppBuilder();
  const { layout } = usePageEditing();
  const { newQuestion, stopAdding } = useCanvasState();

  if (newQuestion) {
    return (
      <div className={className}>
        <NewComponentForm
          type={newQuestion.type}
          hasDataModel={Boolean(dataModel)}
          takenFieldNames={getFieldNames(dataModel?.schema)}
          isSaving={addFlow.isSaving}
          onAdd={(values) => void addFlow.addQuestion(values)}
          onCancel={stopAdding}
        />
      </div>
    );
  }

  const nameOf = (componentId: string): string => {
    const component = findComponent(layout, componentId);
    const name = component ? (getComponentText(component, texts) ?? componentId) : componentId;
    return truncate(name);
  };

  const placementTexts: Record<Placement['kind'], () => string> = {
    before: () =>
      t('app_builder.add_component.before', {
        name: nameOf((placement as { componentId: string }).componentId),
      }),
    inGroup: () =>
      t('app_builder.add_component.in_group', {
        name: nameOf((placement as { groupId: string }).groupId),
      }),
    end: () => t('app_builder.add_component.end'),
  };

  return (
    <div className={className}>
      <AddComponentBox
        placementText={placementTexts[placement.kind]()}
        onChooseType={(type) => addFlow.chooseType(type, placement)}
        onCancel={stopAdding}
      />
    </div>
  );
}

/** Asks what to remove with the component the user wants to delete, and deletes it. */
function DeleteComponentDialog(): ReactElement | null {
  const { componentIdToDelete } = useCanvasState();
  if (!componentIdToDelete) return null;
  return (
    <DeleteComponentDialogContent key={componentIdToDelete} componentId={componentIdToDelete} />
  );
}

type DeleteComponentDialogContentProps = {
  componentId: string;
};

/**
 * Asks what to remove with the component the user wants to delete, and deletes it. The canvas drops
 * the component as soon as the page is saved, before its texts and fields are removed, so the dialog
 * keeps what it deletes from when it opened. It then stays open if a later step fails.
 */
function DeleteComponentDialogContent({
  componentId,
}: DeleteComponentDialogContentProps): ReactElement | null {
  const { t } = useTranslation();
  const { org, app, layoutSetName, texts, dataModel } = useAppBuilder();
  const { pageName, layout } = usePageEditing();
  const { requestDelete, selectComponent } = useCanvasState();
  const deleteComponent = useDeleteComponent(org, app, layoutSetName, pageName, layout, dataModel);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  // A group's children are deleted with it, so what they use is offered too.
  const [deletedComponents] = useState(() =>
    Array.from(getComponentAndDescendantIds(layout, componentId))
      .map((id) => findComponent(layout, id))
      .filter(Boolean),
  );
  const component = deletedComponents[0];
  if (!component) return null;
  const componentName = getComponentText(component, texts) ?? component.id;

  const handleDelete = async ({ textKeys, fieldNames }: DeleteSelection): Promise<void> => {
    setIsDeleting(true);
    const isDeleted = await deleteComponent({
      componentId,
      textKeysToDelete: textKeys,
      fieldNamesToDelete: fieldNames,
    });
    setIsDeleting(false);
    if (isDeleted) {
      selectComponent(undefined);
      requestDelete(undefined);
    }
  };

  return (
    <DeleteDialog
      title={t('app_builder.delete.title', { componentName })}
      description={t('app_builder.delete.description')}
      components={deletedComponents}
      isDeleting={isDeleting}
      onDelete={(selection) => void handleDelete(selection)}
      onClose={() => requestDelete(undefined)}
    />
  );
}

const maxNameLength = 40;

function truncate(text: string): string {
  return text.length > maxNameLength ? `${text.slice(0, maxNameLength)}…` : text;
}

function useEscapeToDeselect(containerRef: React.RefObject<HTMLDivElement>): void {
  const { selectComponent } = useCanvasState();
  const selectRef = useRef(selectComponent);
  selectRef.current = selectComponent;
  useEffect(() => {
    const document = containerRef.current?.ownerDocument;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') selectRef.current(undefined);
    };
    document?.addEventListener('keydown', handleKeyDown);
    return () => document?.removeEventListener('keydown', handleKeyDown);
  }, [containerRef]);
}

/** A text, heading or group added with a default text gets focus, so the user can type over it. */
function useFocusAddedText(containerRef: React.RefObject<HTMLDivElement>, addFlow: AddFlow): void {
  const { addedComponentId, clearAddedComponent } = addFlow;
  useEffect(() => {
    if (!addedComponentId) return;
    const text = containerRef.current?.querySelector<HTMLElement>(
      `[data-component-id="${addedComponentId}"] [${TEXT_KEY_ATTRIBUTE}]`,
    );
    if (!text) return;
    text.focus();
    text.ownerDocument.getSelection()?.selectAllChildren(text);
    clearAddedComponent();
  });
}
