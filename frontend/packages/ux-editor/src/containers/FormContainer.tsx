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
  handleEdit: (component: IFormContainer) => void;
  handleSave: (id: string, updatedContainer: IFormContainer) => Promise<void>;
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
  handleSave,
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

  const handleComponentDelete = useCallback((): void => {
    handleDeleteFormContainer(id);
    handleDiscard();
  }, [handleDeleteFormContainer, handleDiscard, id]);

  return (
    <div
      className={cn(
        classes.wrapper,
        !isBaseContainer && classes.formGroupWrapper,
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
      {expanded && children}
    </div>
  );
};
