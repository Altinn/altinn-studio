import React, { useCallback, useState, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import cn from 'classnames';
import '../styles/index.css';
import classes from './FormContainer.module.css';
import { useDeleteFormContainerMutation } from '../hooks/mutations/useDeleteFormContainerMutation';
import type { FormContainer as IFormContainer } from '../types/FormContainer';
import { FormContainerHeader } from './FormContainerHeader';
import { ConnectDragSource } from 'react-dnd';
import { useFormLayoutsSelector } from "../hooks/useFormLayoutsSelector";
import { selectedLayoutSetSelector } from "../selectors/formLayoutSelectors";

export interface IFormContainerProps {
  children: ReactNode;
  container: IFormContainer;
  dragHandleRef?: ConnectDragSource;
  handleDiscard: () => void;
  handleEdit: (container: IFormContainer) => void;
  id: string;
  isBaseContainer?: boolean;
  isEditMode: boolean;
}

export const FormContainer = ({
  children,
  container,
  dragHandleRef,
  handleDiscard,
  handleEdit,
  id,
  isBaseContainer,
  isEditMode,
} : IFormContainerProps) => {
  const { org, app } = useParams();
  const selectedLayoutSetName = useFormLayoutsSelector(selectedLayoutSetSelector);

  const { mutate: deleteFormContainer } = useDeleteFormContainerMutation(org, app, selectedLayoutSetName);

  const handleDeleteFormContainer = useCallback(
    deleteFormContainer,
    [deleteFormContainer]
  );

  const [expanded, setExpanded] = useState<boolean>(true);

  const handleDelete = useCallback((event: React.MouseEvent<HTMLButtonElement>): void => {
    event.stopPropagation();
    handleDeleteFormContainer(id);
    handleDiscard();
  }, [handleDeleteFormContainer, handleDiscard, id]);

  return (
    <div
      className={cn(
        classes.wrapper,
        isEditMode && classes.editMode,
        !isBaseContainer && classes.formGroupWrapper,
      )}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        if (isEditMode) return;
        if (isBaseContainer) {
          handleEdit(null);
        } else {
          handleEdit({ ...container, id });
        }
      }}
    >
      {!isBaseContainer && (
        <FormContainerHeader
          id={isEditMode ? container.id : id}
          expanded={expanded}
          isEditMode={isEditMode}
          handleExpanded={setExpanded}
          handleDelete={handleDelete}
          handleEdit={handleEdit}
          dragHandleRef={dragHandleRef}
        />
      )}
      {expanded && children}
    </div>
  );
};
