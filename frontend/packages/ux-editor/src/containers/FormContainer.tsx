import React, { useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import cn from 'classnames';
import '../styles/index.css';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import type { EditorDndEvents } from './helpers/dnd-types';
import classes from './FormContainer.module.css';
import { useDeleteFormContainerMutation } from '../hooks/mutations/useDeleteFormContainerMutation';
import { FormContainerEmptyPlaceholder } from './FormContainerEmptyPlaceholder';
import type { IFormContainer } from '../types/global';
import { FormContainerHeader } from './FormContainerHeader';

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
  const { org, app } = useParams();

  const { mutate: deleteFormContainer } = useDeleteFormContainerMutation(org, app);

  const [expanded, setExpanded] = useState<boolean>(true);

  const handleComponentDelete = useCallback((event: React.MouseEvent<HTMLButtonElement>): void => {
    deleteFormContainer(id);
    handleDiscard();
  }, [id]);

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
          {!isBaseContainer && (
            <FormContainerHeader
              id={id}
              container={container}
              expanded={expanded}
              handleExpanded={setExpanded}
              isEditMode={isEditMode}
              handleDelete={handleComponentDelete}
              handleDiscard={handleDiscard}
              handleEdit={handleEdit}
              handleSave={handleSave}
              dragHandleRef={dragHandleRef}
            />
          )}
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
