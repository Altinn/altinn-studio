import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { EditModalContent } from './config/EditModalContent';
import '../styles/index.css';
import { getComponentTitleByComponentType, getTextResource, truncate } from '../utils/language';
import { componentIcons, ComponentType } from './';
import { FormLayoutActions } from '../features/formDesigner/formLayout/formLayoutSlice';
import type { FormComponentType, IAppState, IFormComponent } from '../types/global';
import classes from './EditFormComponent.module.css';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { XMarkIcon, TrashIcon, PencilIcon, MonitorIcon, CheckmarkIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import type { ConnectDragSource } from 'react-dnd';
import { DragHandle } from './DragHandle';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { textResourcesByLanguageSelector } from '../selectors/textResourceSelectors';
import { ComponentPreview } from '../containers/ComponentPreview';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { useDeleteFormComponentMutation } from '../hooks/mutations/useDeleteFormComponentMutation';
import { useTextResourcesSelector } from '../hooks/useTextResourcesSelector';
import { ITextResource } from 'app-shared/types/global';
import { deepCopy } from 'app-shared/pure';

export interface IEditFormComponentProps {
  component: IFormComponent;
  id: string;
  partOfGroup?: boolean;
  children: any;
  dragHandleRef: ConnectDragSource;
}

enum EditFormComponentMode {
  Closed = 'closed',
  Edit = 'edit',
  Preview = 'preview',
}

export function EditFormComponent(props: IEditFormComponentProps) {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { org, app } = useParams();
  const { mutate: updateFormComponent } = useUpdateFormComponentMutation(org, app);
  const { mutate: deleteFormComponent } = useDeleteFormComponentMutation(org, app);
  const [component, setComponent] = useState<IFormComponent>({
    id: props.id,
    ...props.component,
  });
  const [mode, setMode] = useState<EditFormComponentMode>(EditFormComponentMode.Closed);
  const isEditMode = mode === EditFormComponentMode.Edit;
  const isPreviewMode = mode === EditFormComponentMode.Preview;
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(textResourcesByLanguageSelector(DEFAULT_LANGUAGE));
  const selectedLayout = useSelector(
    (state: IAppState) => state.formDesigner.layout?.selectedLayout
  );
  const previewableComponents = [
    ComponentType.Checkboxes,
    ComponentType.RadioButtons,
    ComponentType.Button,
    ComponentType.NavigationButtons,
  ]; // Todo: Remove this when all components become previewable. Until then, add components to this list when implementing preview mode.

  const isPreviewable = previewableComponents.includes(component.type as ComponentType);
  const handleComponentUpdate = (updatedComponent: IFormComponent): void => {
    setComponent({ ...updatedComponent });
  };

  const handleComponentChangeAndSave = (updatedComponent: IFormComponent): void => {
    handleComponentUpdate(updatedComponent);
    handleSaveChange(updatedComponent);
  };

  const handleComponentDelete = (event: React.MouseEvent<HTMLButtonElement>): void => {
    deleteFormComponent(props.id);
  };

  const handleOpenEdit = (): void => {
    setMode(EditFormComponentMode.Edit);
  };

  const handleSave = (): void => {
    setMode(isPreviewable ? EditFormComponentMode.Preview : EditFormComponentMode.Closed);
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
  };

  const handleDiscard = (): void => {
    setComponent({ ...props.component, id: props.id });
    setMode(EditFormComponentMode.Closed);
  };

  const handleSaveChange = (callbackComponent: FormComponentType) =>
    updateFormComponent({
      id: props.id,
      updatedComponent: callbackComponent,
    });

  return (
    <div className={cn(classes.wrapper, isPreviewMode && classes.previewMode)} role='listitem'>
      <div className={classes.formComponentWithHandle}>
        <div ref={props.dragHandleRef} className={classes.dragHandle}>
          <DragHandle />
        </div>
        <div
          className={classes.formComponent}
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
              component={deepCopy(component)}
              handleComponentUpdate={handleComponentUpdate}
            />
          )}
          {(mode === EditFormComponentMode.Closed || !component) && (
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
          <Button
            data-testid='component-delete-button'
            color={ButtonColor.Secondary}
            icon={<TrashIcon />}
            onClick={handleComponentDelete}
            tabIndex={0}
            title={t('general.delete')}
            variant={ButtonVariant.Quiet}
          />
          <Button
            color={ButtonColor.Secondary}
            icon={<PencilIcon />}
            onClick={handleOpenEdit}
            tabIndex={0}
            title={t('general.edit')}
            variant={ButtonVariant.Quiet}
          />
          {isPreviewable && (
            <Button
              color={ButtonColor.Secondary}
              icon={<MonitorIcon title={t('general.preview')} />}
              onClick={() => setMode(EditFormComponentMode.Preview)}
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
              onClick={() => setMode(EditFormComponentMode.Preview)}
              title='Forhåndsvisning (under utvikling)'
              variant={ButtonVariant.Quiet}
            />
          )}
        </div>
      )}
    </div>
  );
}
