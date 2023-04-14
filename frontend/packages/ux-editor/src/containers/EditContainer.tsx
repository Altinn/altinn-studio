import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EditModalContent } from '../components/config/EditModalContent';
import '../styles/index.css';
import { getComponentTitleByComponentType, getTextResource, truncate } from '../utils/language';
import { componentIcons, ComponentType } from '../components';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { FormComponentType, IAppState, IFormComponent } from '../types/global';
import classes from './EditContainer.module.css';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { XMarkIcon, TrashIcon, PencilIcon, MonitorIcon, CheckmarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import type { ConnectDragSource } from 'react-dnd';
import { DragHandle } from '../components/DragHandle';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { textResourcesByLanguageSelector } from '../selectors/textResourceSelectors';
import { ComponentPreview } from './ComponentPreview';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../selectors/formLayoutSelectors';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { useDeleteFormComponentsMutation } from '../hooks/mutations/useDeleteFormComponentsMutation';
import { useTextResourcesSelector } from '../hooks/useTextResourcesSelector';
import { ITextResource } from 'app-shared/types/global';

export interface IEditContainerProps {
  component: IFormComponent;
  id: string;
  firstInActiveList: boolean;
  lastInActiveList: boolean;
  sendItemToParent: any;
  singleSelected: boolean;
  partOfGroup?: boolean;
  children: any;
  dragHandleRef: ConnectDragSource;
}

enum EditContainerMode {
  Closed = 'closed',
  Edit = 'edit',
  Preview = 'preview',
}

export function EditContainer(props: IEditContainerProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { org, app } = useParams();
  const updateFormComponentMutation = useUpdateFormComponentMutation(org, app);
  const deleteFormComponentMutation = useDeleteFormComponentsMutation(org, app);
  const [component, setComponent] = useState<IFormComponent>({
    id: props.id,
    ...props.component,
  });
  const [mode, setMode] = useState<EditContainerMode>(EditContainerMode.Closed);
  const isEditMode = mode === EditContainerMode.Edit;
  const isPreviewMode = mode === EditContainerMode.Preview;
  const [listItem, setListItem] = useState<any>({
    id: props.id,
    firstInActiveList: props.firstInActiveList,
    lastInActiveList: props.lastInActiveList,
    inEditMode: false,
    order: null,
  });
  const activeList = useSelector((state: IAppState) => state.formDesigner.layout.activeList);
  const { order } = useFormLayoutsSelector(selectedLayoutSelector);
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(textResourcesByLanguageSelector(DEFAULT_LANGUAGE));
  const selectedLayout = useSelector(
    (state: IAppState) => state.formDesigner.layout?.selectedLayout
  );
  const previewableComponents = [
    ComponentType.Checkboxes,
    ComponentType.RadioButtons,
    ComponentType.Button,
    ComponentType.NavigationButtons,
  ];
  // Todo: Remove this when all components become previewable. Until then, add components to this list when implementing preview mode.
  const isPreviewable = previewableComponents.includes(component.type as ComponentType);
  const handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    setComponent({ ...updatedComponent });
  };

  const handleComponentChangeAndSave = (updatedComponent: IFormComponent): void => {
    handleComponentUpdate(updatedComponent);
    handleSaveChange(updatedComponent);
  };

  const handleComponentDelete = (event: React.MouseEvent<HTMLButtonElement>): void => {
    const componentsToDelete = activeList.length > 1 ? activeList : [props.id];
    deleteFormComponentMutation.mutate(componentsToDelete);
    dispatch(FormLayoutActions.deleteActiveList());
    event.stopPropagation();
  };

  const handleOpenEdit = (): void => {
    setMode(EditContainerMode.Edit);
    const newListItem = { ...listItem, inEditMode: true };
    setListItem(newListItem);
    props.sendItemToParent(listItem);
  };

  const handleSetActive = (): void => {
    if (!isEditMode) {
      const key: any = Object.keys(order)[0];
      const orderIndex = order[key].indexOf(listItem.id);
      const newListItem = { ...listItem, order: orderIndex };
      setListItem(newListItem);
      props.sendItemToParent(newListItem);
    }
  };

  const handleSave = (): void => {
    const newListItem = { ...listItem, inEditMode: false };
    setListItem(newListItem);
    setMode(isPreviewable ? EditContainerMode.Preview : EditContainerMode.Closed);
    if (JSON.stringify(component) !== JSON.stringify(props.component)) {
      handleSaveChange(component);
      if (props.id !== component.id) {
        dispatch(
          FormLayoutActions.updateFormComponentId({
            newId: component.id,
            currentId: props.id,
            org,
            app,
          })
        );
      }
    }
    props.sendItemToParent(newListItem);
    dispatch(FormLayoutActions.deleteActiveList());
  };

  const handleDiscard = (): void => {
    setComponent({ ...props.component, id: props.id });
    setMode(EditContainerMode.Closed);
    dispatch(FormLayoutActions.deleteActiveList());
  };

  const handleSaveChange = (callbackComponent: FormComponentType) =>
    updateFormComponentMutation.mutate({
      id: props.id,
      updatedComponent: callbackComponent,
    });

  const handleKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      handleSetActive();
    }
  };

  const activeListIndex = activeList.findIndex((item: any) => item.id === props.id);
  return (
    <div className={cn(classes.wrapper, isPreviewMode && classes.previewMode)} role='listitem'>
      <div className={classes.formComponentWithHandle}>
        <div ref={props.dragHandleRef} className={classes.dragHandle}>
          <DragHandle />
        </div>
        <div
          className={classes.formComponent}
          onClick={handleSetActive}
          onKeyDown={handleKeyPress}
          tabIndex={0}
        >
          {isPreviewMode && component && (
            <ComponentPreview
              component={component}
              handleComponentChange={handleComponentChangeAndSave}
              layoutName={selectedLayout}
            />
          )}
          {isEditMode && component && (
            <EditModalContent
              component={JSON.parse(JSON.stringify(component))}
              handleComponentUpdate={handleComponentUpdate}
            />
          )}
          {(mode === EditContainerMode.Closed || !component) && (
            <div className={classes.formComponentTitle}>
              <i className={componentIcons[component.type] || 'fa fa-help-circle'} />
              {component.textResourceBindings?.title
                ? truncate(getTextResource(component.textResourceBindings.title, textResources), 80)
                : getComponentTitleByComponentType(component.type, t) ||
                  t('ux_editor.component_unknown')}
            </div>
          )}
        </div>
      </div>
      {!isEditMode && (
        <div className={classes.buttons}>
          {(activeListIndex === 0 || activeList.length < 1) && (
            <Button
              data-testid='component-delete-button'
              color={ButtonColor.Secondary}
              icon={<TrashIcon title={t('general.delete')} />}
              onClick={handleComponentDelete}
              tabIndex={0}
              variant={ButtonVariant.Quiet}
            />
          )}
          {(activeList.length < 1 || (activeList.length === 1 && activeListIndex === 0)) && (
            <Button
              color={ButtonColor.Secondary}
              icon={<PencilIcon title={t('general.edit')} />}
              onClick={handleOpenEdit}
              tabIndex={0}
              variant={ButtonVariant.Quiet}
            />
          )}
          {isPreviewable && (
            <Button
              color={ButtonColor.Secondary}
              icon={<MonitorIcon title={t('general.preview')} />}
              onClick={() => setMode(EditContainerMode.Preview)}
              title='Forhåndsvisning (under utvikling)'
              variant={ButtonVariant.Quiet}
            />
          )}
        </div>
      )}
      {isEditMode && (
        <div className={classes.buttons}>
          <Button
            color={ButtonColor.Secondary}
            icon={<XMarkIcon title={t('general.cancel')} />}
            onClick={handleDiscard}
            tabIndex={0}
            variant={ButtonVariant.Quiet}
          />
          <Button
            color={ButtonColor.Secondary}
            icon={<CheckmarkIcon title={t('general.save')} />}
            onClick={handleSave}
            tabIndex={0}
            variant={ButtonVariant.Quiet}
          />
          {isPreviewable && (
            <Button
              color={ButtonColor.Secondary}
              icon={<MonitorIcon title={t('general.preview')} />}
              onClick={() => setMode(EditContainerMode.Preview)}
              title='Forhåndsvisning (under utvikling)'
              variant={ButtonVariant.Quiet}
            />
          )}
        </div>
      )}
    </div>
  );
}
