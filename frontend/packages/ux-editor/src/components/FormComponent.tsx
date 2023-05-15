import React, { memo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { EditorDndEvents } from '../containers/helpers/dnd-types';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { componentIcons, ComponentType } from './';
import { DroppableDraggableComponent } from '../containers/DroppableDraggableComponent';
import '../styles/index.css';
import { getComponentTitleByComponentType, getTextResource, truncate } from '../utils/language';
import classes from './FormComponent.module.css';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { XMarkIcon, TrashIcon, PencilIcon, CheckmarkIcon, MonitorIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import { DragHandle } from './DragHandle';
import { textResourcesByLanguageSelector } from '../selectors/textResourceSelectors';
import { ComponentPreview } from '../containers/ComponentPreview';
import { useTranslation } from 'react-i18next';
import { useDeleteFormComponentMutation } from '../hooks/mutations/useDeleteFormComponentMutation';
import { useTextResourcesSelector } from '../hooks/useTextResourcesSelector';
import { ITextResource } from 'app-shared/types/global';
import { selectedLayoutNameSelector } from '../selectors/formLayoutSelectors';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import type { FormComponent as IFormComponent } from '../types/FormComponent';

export interface IFormComponentProps {
  id: string;
  containerId: string;
  index: number;
  dndEvents: EditorDndEvents;
  isEditMode: boolean;
  component: IFormComponent;
  handleEdit: (component: IFormComponent) => void;
  handleSave: (id: string, updatedComponent: IFormComponent) => Promise<void>;
  handleDiscard: () => void;
}

export const FormComponent = memo(function FormComponent({
    id,
    containerId,
    index,
    dndEvents,
    isEditMode,
    component,
    handleEdit,
    handleSave,
    handleDiscard
  }: IFormComponentProps) {
  const { t } = useTranslation();
  const { org, app } = useParams();

  const { mutate: deleteFormComponent } = useDeleteFormComponentMutation(org, app);

  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(textResourcesByLanguageSelector(DEFAULT_LANGUAGE));
  const selectedLayout = useFormLayoutsSelector(selectedLayoutNameSelector);

  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);

  const previewableComponents = [
    ComponentType.Checkboxes,
    ComponentType.RadioButtons,
    ComponentType.Button,
    ComponentType.NavigationButtons,
  ]; // Todo: Remove this when all components become previewable. Until then, add components to this list when implementing preview mode.

  const isPreviewable = previewableComponents.includes(component?.type as ComponentType);

  const handleComponentDelete = (event: React.MouseEvent<HTMLButtonElement>): void => {
    deleteFormComponent(id);
    handleDiscard();
  };

  const handlePreview = () => {
    setIsPreviewMode(previous => !previous);
  };

  return (
    <DroppableDraggableComponent
      canDrag
      containerId={containerId}
      dndEvents={dndEvents}
      id={id}
      index={index}
      component={(dragHandleRef) => (
        <div className={cn(classes.wrapper, isEditMode && classes.editMode, isPreviewMode && classes.previewMode)} role='listitem'>
          <div className={classes.formComponentWithHandle}>
            <div ref={dragHandleRef} className={classes.dragHandle}>
              <DragHandle />
            </div>
            <div className={classes.formComponent} tabIndex={0}>
              {isPreviewMode ? (
                <ComponentPreview
                  component={component}
                  handleComponentChange={handleEdit}
                  layoutName={selectedLayout}
                />
              ) : (
                <div className={classes.formComponentTitle}>
                  <i className={componentIcons[component.type] || 'fa fa-help-circle'} />
                  {component.textResourceBindings?.title
                    ? truncate(
                        getTextResource(component.textResourceBindings.title, textResources),
                        80
                      )
                    : getComponentTitleByComponentType(component.type, t) ||
                      t('ux_editor.component_unknown')}
                </div>
              )}
            </div>
          </div>
          <div className={classes.buttons}>
              {!isEditMode ? (
              <>
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
                  onClick={() => handleEdit(component)}
                  tabIndex={0}
                  title={t('general.edit')}
                  variant={ButtonVariant.Quiet}
                />
              </>
            ) : (
              <>
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
                  onClick={() => handleSave(id, component)}
                  tabIndex={0}
                  variant={ButtonVariant.Quiet}
                />
              </>
            )}
            {
              isPreviewable && (
                <Button
                color={ButtonColor.Secondary}
                icon={<MonitorIcon title={t('general.preview')} />}
                onClick={handlePreview}
                title='Forhåndsvisning (under utvikling)'
                variant={ButtonVariant.Quiet}
                />
              )
            }
          </div>
        </div>
      )}
    />
  );
});
