import React, { ReactNode } from 'react';
import classes from './RenderedFormContainer.module.css';
import {
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
} from '../../types/global';
import { ConnectDragSource } from 'react-dnd';
import { FormContainer } from '../FormContainer';
import type { FormContainer as IFormContainer } from '../../types/FormContainer';
import type { FormComponent as IFormComponent } from '../../types/FormComponent';
import { ComponentType } from 'app-shared/types/ComponentType';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { FormComponent } from '../../components/FormComponent';
import { useFormContext } from '../FormContext';
import { useTranslation } from 'react-i18next';

export type RenderedFormContainerProps = {
  /**
   * The id of the container
   */
  containerId: string;
  /**
   * The order from the layouts data
   */
  formLayoutOrder: IFormLayoutOrder;
  /**
   * The containers from the layouts data
   */
  formDesignerContainers: IFormDesignerContainers;
  /**
   * The components from the layouts data
   */
  formDesignerComponents: IFormDesignerComponents;
};

/**
 * @component
 *     Displays the rendered form container
 *
 * @property {string}[containerId] - The id of the container
 * @property {IFormLayoutOrder}[formLayoutOrder] - The order from the layouts data
 * @property {IFormDesignerContainers}[formDesignerContainers] - The containers from the layouts data
 * @property {IFormDesignerComponents}[formDesignerComponents] - The components from the layouts data
 *
 * @returns {ReactNode} - The rendered component
 */
export const RenderedFormContainer = ({
  containerId,
  formLayoutOrder,
  formDesignerContainers,
  formDesignerComponents,
}: RenderedFormContainerProps): ReactNode => {
  const { formId, form, handleDiscard, handleEdit, handleSave, debounceSave } = useFormContext();

  const { t } = useTranslation();

  const renderContainer = (
    id: string,
    isBaseContainer: boolean,
    order: IFormLayoutOrder,
    containers: IFormDesignerContainers,
    components: IFormDesignerComponents,
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
                  return (
                    containers[itemId] &&
                    renderContainer(itemId, false, order, containers, components, itemDragHandleRef)
                  );
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

  return renderContainer(
    containerId,
    true,
    formLayoutOrder,
    formDesignerContainers,
    formDesignerComponents,
  );
};
