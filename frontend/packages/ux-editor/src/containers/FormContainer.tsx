import React, { useCallback, useState, ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import cn from 'classnames';
import '../styles/index.css';
import classes from './FormContainer.module.css';
import { useDeleteFormContainerMutation } from '../hooks/mutations/useDeleteFormContainerMutation';
import type { FormContainer as IFormContainer } from '../types/FormContainer';
import { FormContainerHeader } from './FormContainerHeader';
import { ConnectDragSource } from 'react-dnd';
import { selectedLayoutSetSelector } from "../selectors/formLayoutSelectors";
import { useSelector } from 'react-redux';
import { ComponentType } from 'app-shared/types/ComponentType';
import { hasSubContainers } from '../../../ux-editor/src/utils/formLayoutUtils';
import { IInternalLayout } from '../types/global';
import { ExternalComponent } from 'app-shared/types/api/FormLayoutsResponse';

export interface IFormContainerProps {
  children: ReactNode;
  container: IFormContainer;
  dragHandleRef?: ConnectDragSource;
  handleDiscard: () => void;
  handleEdit: (container: IFormContainer) => void;
  id: string;
  isBaseContainer?: boolean;
  isEditMode: boolean;
  components: ExternalComponent
  itemId: string
  layout: ExternalComponent[];
  
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
  components,
  itemId,
  layout
 
} : IFormContainerProps) => {
  const { org, app } = useParams();
  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);

  const { mutate: deleteFormContainer } = useDeleteFormContainerMutation(org, app, selectedLayoutSetName);

  const handleDeleteFormContainer = useCallback(
    deleteFormContainer,
    [deleteFormContainer]
  );

  const [expanded, setExpanded] = useState<boolean>(true);
  const hasNestedGroup = () => {
    // Check if the current container has any nested "Group" components
   return null
  };

 const handleDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      if (hasNestedGroup()) {
        const userConfirmed = window.confirm(
          "This container has nested Group components. Are you sure you want to delete it?"
        );
        if (!userConfirmed) {
          return;
        }
      }

      event.stopPropagation();
      handleDeleteFormContainer(id);
      handleDiscard();
    },
    [handleDeleteFormContainer, handleDiscard, id]
  );



  /*  const handleDelete = useCallback((event: React.MouseEvent<HTMLButtonElement>): void => {

    if(ComponentType.Group ){

      const userConfirmed = window.confirm("Are you sure you want to delete this group?");
      if (userConfirmed) {
       event.stopPropagation();
        handleDeleteFormContainer(id);
        handleDiscard();
      }
    }
  
  }, [handleDeleteFormContainer, handleDiscard, id]);
  */

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
