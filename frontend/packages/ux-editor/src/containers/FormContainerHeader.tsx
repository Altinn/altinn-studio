import React, { memo } from 'react';
import { ConnectDragSource } from 'react-dnd';
import cn from 'classnames';
import '../styles/index.css';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import classes from './FormContainerHeader.module.css';
import { ChevronUpIcon, TrashIcon, ChevronDownIcon } from '@navikt/aksel-icons';
import { DragHandle } from '../components/dragAndDrop/DragHandle';
import { useTranslation } from 'react-i18next';

export interface IFormContainerHeaderProps {
  id: string;
  expanded: boolean;
  isEditMode: boolean;
  handleExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  handleDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
  dragHandleRef: ConnectDragSource
}

export const FormContainerHeader = memo(function FormContainerHeader({
  id,
  expanded,
  isEditMode,
  handleExpanded,
  handleDelete,
  dragHandleRef,
} : IFormContainerHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className={cn(isEditMode && classes.editMode, classes.formGroup)} data-testid='form-group'>
      <div ref={dragHandleRef} className={classes.dragHandle}>
        <DragHandle />
      </div>
      <div className={classes.formGroupBar}>
        <Button
          color={ButtonColor.Secondary}
          icon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          onClick={() => handleExpanded((previous) => !previous)}
          variant={ButtonVariant.Quiet}
        />
        {t('ux_editor.component_group_header', { id })}
      </div>
      <div className={classes.formGroupButtons}>
        <Button
          icon={<TrashIcon title={t('general.delete')} />}
          onClick={handleDelete}
          variant={ButtonVariant.Quiet}
        />
      </div>
    </div>
  );
});
