import React, { memo, useState } from 'react';
import '../../styles/index.css';
import classes from './FormComponent.module.css';
import cn from 'classnames';
import type { FormComponent as IFormComponent } from '../../types/FormComponent';
import { StudioButton } from '@studio/components';
import type { ConnectDragSource } from 'react-dnd';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { DragHandle } from './DragHandle';
import type { ITextResource } from 'app-shared/types/global';
import { TrashIcon } from '@navikt/aksel-icons';
import { formItemConfigs } from '../../data/formItemConfig';
import { getComponentTitleByComponentType, getTextResource, truncate } from '../../utils/language';
import { textResourcesByLanguageSelector } from '../../selectors/textResourceSelectors';
import { useDeleteFormComponentMutation } from '../../hooks/mutations/useDeleteFormComponentMutation';
import { useTextResourcesSelector } from '../../hooks';
import { useTranslation } from 'react-i18next';
import { AltinnConfirmDialog } from 'app-shared/components';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../hooks/useAppContext';

export interface IFormComponentProps {
  component: IFormComponent;
  dragHandleRef?: ConnectDragSource;
  handleDiscard: () => void;
  handleEdit: (component: IFormComponent) => void;
  handleSave: () => Promise<void>;
  debounceSave: (id?: string, updatedForm?: IFormComponent) => Promise<void>;
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
  const { org, app } = useStudioUrlParams();

  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE),
  );
  const { selectedLayoutSet } = useAppContext();
  const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState<boolean>();
  const Icon = formItemConfigs[component.type]?.icon;

  const { mutate: deleteFormComponent } = useDeleteFormComponentMutation(
    org,
    app,
    selectedLayoutSet,
  );

  const handleDelete = (): void => {
    deleteFormComponent(id);
    if (isEditMode) handleDiscard();
  };

  const textResource = getTextResource(component.textResourceBindings?.title, textResources);

  return (
    <div
      className={cn(classes.wrapper, isEditMode && classes.editMode)}
      role='listitem'
      onClick={async (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        if (isEditMode) return;
        await handleSave();
        handleEdit(component);
      }}
      aria-labelledby={`${id}-title`}
    >
      <div className={classes.formComponentWithHandle}>
        <div ref={dragHandleRef} className={classes.dragHandle}>
          <DragHandle />
        </div>
        <div className={classes.formComponent} tabIndex={0}>
          <div className={classes.formComponentTitle}>
            <span className={classes.icon}>
              {Icon && (
                <Icon title={getComponentTitleByComponentType(component.type, t)} aria-hidden />
              )}
            </span>
            <span id={`${id}-title`}>
              {textResource
                ? truncate(textResource, 80)
                : getComponentTitleByComponentType(component.type, t) ||
                  t('ux_editor.component_unknown')}
            </span>
          </div>
        </div>
      </div>
      <div className={classes.buttons}>
        <AltinnConfirmDialog
          open={isConfirmDeleteDialogOpen}
          confirmText={t('ux_editor.component_deletion_confirm')}
          onConfirm={handleDelete}
          onClose={() => setIsConfirmDeleteDialogOpen(false)}
          trigger={
            <StudioButton
              color='second'
              icon={<TrashIcon />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                event.stopPropagation();
                setIsConfirmDeleteDialogOpen((prevState) => !prevState);
              }}
              tabIndex={0}
              title={t('general.delete')}
              variant='tertiary'
              size='small'
            />
          }
        >
          <p>{t('ux_editor.component_deletion_text')}</p>
        </AltinnConfirmDialog>
      </div>
    </div>
  );
});
