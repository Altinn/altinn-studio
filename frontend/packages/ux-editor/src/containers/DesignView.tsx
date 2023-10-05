import React from 'react';
import { useSelector } from 'react-redux';
import { FormContainer } from './FormContainer';
import type { FormContainer as IFormContainer } from '../types/FormContainer';
import type { FormComponent as IFormComponent } from '../types/FormComponent';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../selectors/formLayoutSelectors';
import { FormComponent } from '../components/FormComponent';
import { useFormLayoutsQuery } from '../hooks/queries/useFormLayoutsQuery';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useFormContext } from './FormContext';
import { ConnectDragSource } from 'react-dnd';
import classes from './DesignView.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { ComponentType } from 'app-shared/types/ComponentType';

export interface DesignViewProps {
  className?: string;
}

export const DesignView = ({ className }: DesignViewProps) => {
  const { org, app } = useStudioUrlParams();
  const selectedLayoutSet: string = useSelector(selectedLayoutSetSelector);
  const { data: layouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const layoutName = useSelector(selectedLayoutNameSelector);
  const { formId, form, handleDiscard, handleEdit, handleSave, debounceSave } = useFormContext();

  const { t } = useTranslation();

  const layout = layouts?.[layoutName];

  const { order, containers, components } = layout || {};

  const renderContainer = (
    id: string,
    isBaseContainer: boolean,
    dragHandleRef?: ConnectDragSource,
  ) => {
    if (!id) return null;

    const items = order[id];

    return (
      <FormContainer
        container={formId === id ? (form as IFormContainer) : containers[id]}
        dragHandleRef={dragHandleRef}
        handleDiscard={handleDiscard}
        handleEdit={handleEdit}
        handleSave={handleSave}
        id={id}
        isBaseContainer={isBaseContainer}
        isEditMode={formId === id}
      >
        <DragAndDrop.List<ComponentType>>
          {items?.length ? (
            items.map((itemId: string) => (
              <DragAndDrop.ListItem<ComponentType>
                key={itemId}
                itemId={itemId}
                renderItem={(itemDragHandleRef) => {
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
                        handleSave={handleSave}
                        debounceSave={debounceSave}
                        handleDiscard={handleDiscard}
                        dragHandleRef={itemDragHandleRef}
                      />
                    );
                  }
                  return containers[itemId] && renderContainer(itemId, false, itemDragHandleRef);
                }}
              />
            ))
          ) : (
            <p className={classes.emptyContainerText}>{t('ux_editor.container_empty')}</p>
          )}
        </DragAndDrop.List>
      </FormContainer>
    );
  };

  return (
    <div className={classes.root}>
      <h1 className={classes.pageHeader}>{layoutName}</h1>
      {layout && renderContainer(BASE_CONTAINER_ID, true)}
    </div>
  );
};
