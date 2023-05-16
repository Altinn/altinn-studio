import React, { memo } from 'react';
import { ConnectDragSource } from 'react-dnd';
import '../styles/index.css';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import classes from './FormContainerHeader.module.css';
import { ChevronUpIcon, TrashIcon, PencilIcon, ChevronDownIcon, XMarkIcon, CheckmarkIcon } from '@navikt/aksel-icons';
import { DragHandle } from '../components/DragHandle';
import { useText } from '../hooks/useText';
import type { IFormContainer } from '../types/global';

export interface IFormContainerHeaderProps {
  id: string;
  container: IFormContainer;
  expanded: boolean;
  handleExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isEditMode: boolean;
  handleDelete: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleDiscard: () => void;
  handleEdit: (component: IFormContainer) => void;
  handleSave: (id: string, updatedContainer: IFormContainer) => Promise<void>;
  dragHandleRef: ConnectDragSource
};

export const FormContainerHeader = memo(function FormContainerHeader({
  id,
  container,
  expanded,
  handleExpanded,
  isEditMode,
  handleDelete,
  handleDiscard,
  handleEdit,
  handleSave,
  dragHandleRef,
} : IFormContainerHeaderProps) {
  const t = useText();
  return (
    <div className={classes.formGroup} data-testid='form-group'>
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
        Gruppe - ${id}
      </div>
      <div className={classes.formGroupButtons}>
        {
          !isEditMode ? (
            <>
              <Button
                icon={<TrashIcon title={t('general.delete')} />}
                onClick={handleDelete}
                variant={ButtonVariant.Quiet}
              />
              <Button
                icon={<PencilIcon title={t('general.edit')} />}
                onClick={() => handleEdit({ ...container, id })}
                variant={ButtonVariant.Quiet}
              />
            </>
          ) : (
            <>
              <Button
                icon={<XMarkIcon title={t('general.cancel')} />}
                onClick={handleDiscard}
                variant={ButtonVariant.Quiet}
              />
              <Button
                icon={<CheckmarkIcon title={t('general.save')} />}
                onClick={() => handleSave(id, container)}
                variant={ButtonVariant.Quiet}
              />
            </>
          )
        }
      </div>
    </div>
  );
});
