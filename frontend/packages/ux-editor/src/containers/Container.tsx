import React, { useState } from 'react';
import { ConnectDragSource } from 'react-dnd';
import { useParams } from 'react-router-dom';
import cn from 'classnames';
import '../styles/index.css';
import { FormComponent } from '../components/FormComponent';
import type { HandleDrop } from '../types/dndTypes';
import { DraggableEditorItemType } from '../types/dndTypes';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import classes from './Container.module.css';
import { ChevronDownIcon, ChevronUpIcon, PencilIcon, TrashIcon } from '@navikt/aksel-icons';
import { DragHandle } from '../components/dragAndDrop/DragHandle';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../selectors/formLayoutSelectors';
import { useDeleteFormContainerMutation } from '../hooks/mutations/useDeleteFormContainerMutation';
import { useText } from '../hooks';
import { EditContainer } from './EditContainer';
import { DragDropListItem } from '../components/dragAndDrop/DragDropListItem';
import { DroppableList } from '../components/dragAndDrop/DroppableList';

export interface IContainerProps {
  isBaseContainer?: boolean;
  id: string;
  handleDrop: HandleDrop;
  dragHandleRef?: ConnectDragSource;
  disabledDrop?: boolean;
}

export const Container = ({
  isBaseContainer,
  id,
  handleDrop,
  dragHandleRef,
  disabledDrop,
}: IContainerProps) => {
  const t = useText();

  const { org, app } = useParams();

  const { mutate: deleteFormContainer } = useDeleteFormContainerMutation(org, app);
  const { components, containers, order } = useFormLayoutsSelector(selectedLayoutSelector);

  const [editMode, setEditMode] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(true);

  const items = order[id];

  const HoverIcons = (): JSX.Element => (
    <>
      <Button
        icon={<TrashIcon title={t('general.delete')} />}
        onClick={() => deleteFormContainer(id)}
        variant={ButtonVariant.Quiet}
      />
      <Button
        icon={<PencilIcon title={t('general.edit')} />}
        onClick={() => setEditMode(true)}
        variant={ButtonVariant.Quiet}
      />
    </>
  );

  const FormGroupHeader = (): JSX.Element => (
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
      <div className={classes.formGroupButtons}><HoverIcons /></div>
    </div>
  );

  return editMode ? (
    <EditContainer
      id={id}
      layoutOrder={order}
      dragHandleRef={dragHandleRef}
      cancelEditMode={() => setEditMode(false)}
    />
  ) : (
    <div
      className={cn(
        classes.wrapper,
        !isBaseContainer && classes.formGroupWrapper,
      )}
    >
      {!isBaseContainer && (<FormGroupHeader />)}
      <DroppableList containerId={id} handleDrop={handleDrop} disabledDrop={disabledDrop}>
        {expanded && components &&
          (items?.length ? ( // Todo: items should always be defined, but when deleting a container, the deleted container component is rerendered before the parent container, so all the data will be undefined for a short time. This is not visible for the user, but it's not ideal.
            items.map((itemId: string, index: number) => {
              const component = components[itemId];
              if (component) {
                return (
                  <DragDropListItem
                    key={itemId}
                    type={DraggableEditorItemType.Component}
                    item={{ isNew: false, id: itemId, position: { index, parentId: id } }}
                    onDrop={handleDrop}
                    disabledDrop={disabledDrop}
                    renderItem={(itemDragHandleRef) => (
                      <FormComponent
                        id={itemId}
                        handleDrop={handleDrop}
                        partOfGroup={!isBaseContainer}
                        dragHandleRef={itemDragHandleRef}
                      />
                    )}
                  />
                );
              }
              return containers[itemId] && (
                <DragDropListItem
                  key={itemId}
                  type={DraggableEditorItemType.Container}
                  item={{ isNew: false, id: itemId, position: { index, parentId: id } }}
                  onDrop={handleDrop}
                  disabledDrop={disabledDrop}
                  renderItem={(itemDragHandleRef, isDragging) => (
                    <Container
                      disabledDrop={isDragging || disabledDrop}
                      dragHandleRef={itemDragHandleRef}
                      handleDrop={handleDrop}
                      id={itemId}
                      isBaseContainer={false}
                    />
                  )}
                />
              );
            })
          ) : (
            <p className={classes.emptyContainerText}>{t('ux_editor.container_empty')}</p>
          ))}
      </DroppableList>
    </div>
  );
};
