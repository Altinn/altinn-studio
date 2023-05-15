import React, { useState } from 'react';
import { ConnectDragSource } from 'react-dnd';
import { useParams } from 'react-router-dom';
import cn from 'classnames';
import '../styles/index.css';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import type { EditorDndEvents } from './helpers/dnd-types';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import classes from './FormContainer.module.css';
import { ChevronUpIcon, TrashIcon, PencilIcon, ChevronDownIcon, XMarkIcon, CheckmarkIcon } from '@navikt/aksel-icons';
import { DragHandle } from '../components/DragHandle';
import { useDeleteFormContainerMutation } from '../hooks/mutations/useDeleteFormContainerMutation';
import { useText } from '../hooks/useText';
import { FormContainerEmptyPlaceholder } from './FormContainerEmptyPlaceholder';
import type { IFormContainer } from '../types/global';

export interface IFormContainerProps {
  isBaseContainer?: boolean;
  id: string;
  parentContainerId?: string;
  index?: number;
  dndEvents: EditorDndEvents;
  canDrag: boolean;
  isEditMode: boolean;
  container: IFormContainer;
  handleEdit: (component: IFormContainer) => void;
  handleSave: (id: string, updatedContainer: IFormContainer) => Promise<void>;
  handleDiscard: () => void;
  children: React.ReactNode[];
}

export const FormContainer = ({
  isBaseContainer,
  id,
  parentContainerId,
  index,
  dndEvents,
  canDrag,
  isEditMode,
  container,
  handleEdit,
  handleSave,
  handleDiscard,
  children,
} : IFormContainerProps) => {
  const t = useText();
  const { org, app } = useParams();

  const { mutate: deleteFormContainer } = useDeleteFormContainerMutation(org, app);

  const [expanded, setExpanded] = useState<boolean>(true);

  const handleComponentDelete = (event: React.MouseEvent<HTMLButtonElement>): void => {
    deleteFormContainer(id);
    handleDiscard();
  };

  const HoverIcons = (): JSX.Element => {
    return !isEditMode ? (
      <>
        <Button
          icon={<TrashIcon title={t('general.delete')} />}
          onClick={handleComponentDelete}
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
  };

  const FormGroupHeader = ({ dragHandleRef } : {dragHandleRef: ConnectDragSource}): JSX.Element => (
    <div className={classes.formGroup} data-testid='form-group'>
      <div ref={dragHandleRef} className={classes.dragHandle}>
        <DragHandle />
      </div>
      <div className={classes.formGroupBar}>
        <Button
          color={ButtonColor.Secondary}
          icon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          onClick={() => setExpanded(!expanded)}
          variant={ButtonVariant.Quiet}
        />
        Gruppe - ${id}
      </div>
      <div className={classes.formGroupButtons}>
        <HoverIcons />
      </div>
    </div>
  );

  return (
    <DroppableDraggableContainer
      id={id}
      index={index}
      isBaseContainer={isBaseContainer}
      parentContainerId={parentContainerId}
      canDrag={canDrag}
      dndEvents={dndEvents}
      container={(dragHandleRef) => (
        <div
          className={cn(
            classes.wrapper,
            !isBaseContainer && classes.formGroupWrapper,
            expanded && classes.expanded
          )}
        >
          {!isBaseContainer && <FormGroupHeader dragHandleRef={dragHandleRef} />}
          {expanded && (
            children.length ? children : (
              <FormContainerEmptyPlaceholder containerId={id} dndEvents={dndEvents} />
            )
          )}
        </div>
      )}
    />
  );
};
