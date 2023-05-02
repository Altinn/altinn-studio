import React, { useState } from 'react';
import { EditModalContent } from '../components/config/EditModalContent';
import '../styles/index.css';
import { getComponentTitleByComponentType, getTextResource, truncate } from '../utils/language';
import { componentIcons, ComponentType } from '../components';
import type { FormComponentType, IFormComponent } from '../types/global';
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
import { useUpdateFormComponentMutation } from '../hooks/mutations/useUpdateFormComponentMutation';
import { useDeleteFormComponentMutation } from '../hooks/mutations/useDeleteFormComponentMutation';
import { useTextResourcesSelector } from '../hooks/useTextResourcesSelector';
import { ITextResource } from 'app-shared/types/global';
import { deepCopy } from 'app-shared/pure';
import { useRuleConfigQuery } from '../hooks/queries/useRuleConfigQuery';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutNameSelector } from '../selectors/formLayoutSelectors';
import { useRuleConfigMutation } from '../hooks/mutations/useRuleConfigMutation';
import { switchSelectedFieldId } from '../utils/ruleConfigUtils';

export interface IEditContainerProps {
  component: IFormComponent;
  id: string;
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
  const { t } = useTranslation();
  const { org, app } = useParams();
  const { data: ruleConfig } = useRuleConfigQuery(org, app);
  const { mutate: updateFormComponent } = useUpdateFormComponentMutation(org, app);
  const { mutate: deleteFormComponent } = useDeleteFormComponentMutation(org, app);
  const { mutateAsync: saveRuleConfig } = useRuleConfigMutation(org, app);
  const [component, setComponent] = useState<IFormComponent>({
    id: props.id,
    ...props.component,
  });
  const [mode, setMode] = useState<EditContainerMode>(EditContainerMode.Closed);
  const isEditMode = mode === EditContainerMode.Edit;
  const isPreviewMode = mode === EditContainerMode.Preview;
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(textResourcesByLanguageSelector(DEFAULT_LANGUAGE));
  const selectedLayout = useFormLayoutsSelector(selectedLayoutNameSelector);

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
    setMode(EditContainerMode.Edit);
  };

  const handleSave = (): void => {
    setMode(isPreviewable ? EditContainerMode.Preview : EditContainerMode.Closed);
    if (JSON.stringify(component) !== JSON.stringify(props.component)) {
      handleSaveChange(component);
      if (props.id !== component.id) {
        switchSelectedFieldId(ruleConfig, props.id, component.id, saveRuleConfig);
      }
    }
  };

  const handleDiscard = (): void => {
    setComponent({ ...props.component, id: props.id });
    setMode(EditContainerMode.Closed);
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
