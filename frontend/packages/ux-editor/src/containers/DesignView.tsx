import React, { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { FormContainer } from './FormContainer';
import type { FormContainer as IFormContainer } from '../types/FormContainer';
import type { FormComponent as IFormComponent } from '../types/FormComponent';
import type { ExistingDndItem, HandleDrop, ItemPosition, NewDndItem } from '../types/dndTypes';
import { DraggableEditorItemType } from '../types/dndTypes';
import { useFormLayoutsSelector } from '../hooks';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../selectors/formLayoutSelectors';
import { FormComponent } from '../components/FormComponent';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { useFormLayoutMutation } from '../hooks/mutations/useFormLayoutMutation';
import { generateComponentId } from '../utils/generateId';
import { moveLayoutItem } from '../utils/formLayoutUtils';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { FormContext } from './FormContext';
import { DroppableList } from '../components/dragAndDrop/DroppableList';
import { DragDropListItem } from '../components/dragAndDrop/DragDropListItem';
import { ConnectDragSource } from 'react-dnd';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useAddItemToLayoutMutation } from '../hooks/mutations/useAddItemToLayoutMutation';
import { ErrorMessage } from '@digdir/design-system-react';

export interface DesignViewProps {
  className?: string;
}

export const DesignView = ({ className }: DesignViewProps) => {
  const { org, app } = useParams();
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState('');
  const getInitialNestedGroupCount = () => {
    const count = localStorage.getItem('nestedGroupCount');
    return count ? parseInt(count, 10) : 0;
  };

  const getInitialNestedGroupIds = () => {
    const ids = localStorage.getItem('nestedGroupIds');
    return ids ? JSON.parse(ids) : [];
  };

  const [nestedGroupCount, setNestedGroupCount] = useState(getInitialNestedGroupCount());
  const [nestedGroupIds, setNestedGroupIds] = useState<string[]>(getInitialNestedGroupIds());
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const { data: layouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const layoutName = useFormLayoutsSelector(selectedLayoutNameSelector);
  const { mutate: addItemToLayout } = useAddItemToLayoutMutation(org, app, selectedLayoutSet);
  const { formId, form, handleDiscard, handleEdit, handleComponentSave } = useContext(FormContext);
  const { mutate: updateFormLayout } = useFormLayoutMutation(
    org,
    app,
    layoutName,
    selectedLayoutSet
  );

  useEffect(() => {
    localStorage.setItem('nestedGroupCount', nestedGroupCount.toString());
    localStorage.setItem('nestedGroupIds', JSON.stringify(nestedGroupIds));
  }, [nestedGroupCount, nestedGroupIds]);

  const layout = layouts?.[layoutName];

  if (!layout) return null;

  const { order, containers, components } = layout;

  const handleNestedGroups = (parentId: string, newId: string, item: NewDndItem) => {
    if (item.type === 'Group' && nestedGroupCount >= 1 && nestedGroupIds.includes(parentId)) {
      const error = t('schema_editor.error_message');
      setErrorMessage(error);
      setTimeout(() => {
        setErrorMessage('');
      }, 3000);
      return false;
    }

    setNestedGroupCount((prevCount) => prevCount + 1);

    if (nestedGroupCount >= 1 && item.type === 'Group') {
      setNestedGroupIds((prevIds) => [...prevIds, newId]);
    }

    return true;
  };

  const addItem = (item: NewDndItem, { parentId, index }: ItemPosition) => {
    const newId = generateComponentId(item.type, layouts);

    if (!handleNestedGroups(parentId, newId, item)) {
      return;
    }

    addItemToLayout({ componentType: item.type, newId, parentId, index });
  };

  const moveItem = (item: ExistingDndItem, { parentId, index }: ItemPosition) => {
    updateFormLayout(moveLayoutItem(layout, item.id, parentId, index));
  };

  const handleDrop: HandleDrop = (item, position) =>
    item.isNew === true ? addItem(item, position) : moveItem(item, position);

  const renderContainer = (
    id: string,
    isBaseContainer: boolean,
    disabledDrop: boolean = false,
    dragHandleRef?: ConnectDragSource
  ) => {
    if (!id) return null;

    const items = order[id];

    return (
      <FormContainer
        container={formId === id ? (form as IFormContainer) : containers[id]}
        dragHandleRef={dragHandleRef}
        handleDiscard={handleDiscard}
        handleEdit={handleEdit}
        id={id}
        isBaseContainer={isBaseContainer}
        isEditMode={formId === id}
        nestedGroupCount={() => {
          setNestedGroupCount((prevCount) => prevCount - 1);
        }}
      >
        <DroppableList containerId={id} handleDrop={handleDrop} disabledDrop={disabledDrop}>
          {items?.length ? (
            items.map((itemId: string, itemIndex: number) => (
              <DragDropListItem
                disabledDrop={disabledDrop}
                key={itemId}
                item={{ isNew: false, id: itemId, position: { parentId: id, index: itemIndex } }}
                onDrop={handleDrop}
                renderItem={(itemDragHandleRef, isDragging) => {
                  const component = components[itemId];
                  if (component) {
                    return (
                      <FormComponent
                        id={itemId}
                        isEditMode={formId === itemId}
                        component={
                          formId === itemId ? (form as IFormComponent) : components[itemId]
                        }
                        handleEdit={handleEdit}
                        handleSave={handleComponentSave}
                        handleDiscard={handleDiscard}
                        dragHandleRef={itemDragHandleRef}
                      />
                    );
                  }
                  return (
                    containers[itemId] &&
                    renderContainer(itemId, false, disabledDrop || isDragging, itemDragHandleRef)
                  );
                }}
                type={
                  components[itemId]
                    ? DraggableEditorItemType.Component
                    : DraggableEditorItemType.Container
                }
              />
            ))
          ) : (
            <p className={classes.emptyContainerText}>{t('ux_editor.container_empty')}</p>
          )}
        </DroppableList>
      </FormContainer>
    );
  };

  return (
    <div
      className={className}
      onClick={(event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        handleEdit(null);
      }}
    >
      <h1 className={classes.pageHeader}>{layoutName}</h1>
      {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
      {renderContainer(BASE_CONTAINER_ID, true)}
    </div>
  );
};
