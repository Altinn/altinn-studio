import React, { memo, useState } from 'react';
import '../styles/index.css';
import classes from './FormComponent.module.css';
import cn from 'classnames';
import type { FormComponent as IFormComponent } from '../types/FormComponent';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import { ComponentPreview } from '../containers/ComponentPreview';
import { ComponentType } from './index';
import { ConnectDragSource } from 'react-dnd';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { DragHandle } from './dragAndDrop/DragHandle';
import { ITextResource } from 'app-shared/types/global';
import { XMarkIcon, TrashIcon, PencilIcon, CheckmarkIcon, MonitorIcon } from '@navikt/aksel-icons';
import { formItemConfigs } from '../data/formItemConfig';
import { getComponentTitleByComponentType, getTextResource, truncate } from '../utils/language';
import { selectedLayoutNameSelector } from '../selectors/formLayoutSelectors';
import { textResourcesByLanguageSelector } from '../selectors/textResourceSelectors';
import { useDeleteFormComponentMutation } from '../hooks/mutations/useDeleteFormComponentMutation';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { useParams } from 'react-router-dom';
import { useTextResourcesSelector } from '../hooks/useTextResourcesSelector';
import { useTranslation } from 'react-i18next';

export interface IFormComponentProps {
  component: IFormComponent;
  dragHandleRef?: ConnectDragSource;
  handleDiscard: () => void;
  handleEdit: (component: IFormComponent) => void;
  handleSave: (id: string, updatedComponent: IFormComponent) => Promise<void>;
  id: string;
  isEditMode: boolean;
}

export const FormComponent = memo(function FormComponent({
  component,
  dragHandleRef,
  handleDiscard,
  handleEdit,
  handleSave,
  id,
  isEditMode,
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

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>): void => {
    deleteFormComponent(id);
    handleDiscard();
  };

  const handlePreview = () => {
    setIsPreviewMode(previous => !previous);
  };

  return (
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
              <i className={formItemConfigs?.[component.type]?.icon || 'fa fa-help-circle'} />
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
              onClick={handleDelete}
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
  );
});
