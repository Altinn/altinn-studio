import React, { useState } from 'react';
import { ConnectDragSource } from 'react-dnd';
import { useParams } from 'react-router-dom';
import cn from 'classnames';
import '../styles/index.css';
import { FormComponent } from '../components/FormComponent';
import type { IFormLayoutOrder } from '../types/global';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import type { EditorDndEvents } from './helpers/dnd-types';
import { Button, ButtonColor, ButtonVariant } from '@digdir/design-system-react';
import classes from './Container.module.css';
import { ChevronUpIcon, TrashIcon, PencilIcon, ChevronDownIcon } from '@navikt/aksel-icons';
import { DragHandle } from '../components/DragHandle';
import { useFormLayoutsSelector } from '../hooks/useFormLayoutsSelector';
import { selectedLayoutSelector } from '../selectors/formLayoutSelectors';
import { useDeleteFormContainerMutation } from '../hooks/mutations/useDeleteFormContainerMutation';
import { useText } from '../hooks/useText';
import { EditContainer } from './EditContainer';
import { EmptyContainerPlaceholder } from './EmptyContainerPlaceholder';

export interface IContainerProps {
  isBaseContainer?: boolean;
  id: string;
  parentContainerId?: string;
  index?: number;
  layoutOrder?: IFormLayoutOrder;
  dndEvents: EditorDndEvents;
  canDrag: boolean;
}

export const Container = (props: IContainerProps) => {
  const t = useText();

  const { org, app } = useParams();

  const { mutate: deleteFormContainer } = useDeleteFormContainerMutation(org, app);
  const { components, containers } = useFormLayoutsSelector(selectedLayoutSelector);

  const [editMode, setEditMode] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(true);

  const items = props.layoutOrder[props.id];

  const HoverIcons = (): JSX.Element => (
    <>
      <Button
        icon={<TrashIcon title={t('general.delete')} />}
        onClick={() => deleteFormContainer(props.id)}
        variant={ButtonVariant.Quiet}
      />
      <Button
        icon={<PencilIcon title={t('general.edit')} />}
        onClick={() => setEditMode(true)}
        variant={ButtonVariant.Quiet}
      />
    </>
  );

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
        Gruppe - ${props.id}
      </div>
      <div className={classes.formGroupButtons}><HoverIcons /></div>
    </div>
  );

  return (
    <DroppableDraggableContainer
      id={props.id}
      index={props.index}
      isBaseContainer={props.isBaseContainer}
      parentContainerId={props.parentContainerId}
      canDrag={props.canDrag}
      dndEvents={props.dndEvents}
      container={(dragHandleRef) =>
        editMode ? (
          <EditContainer
            id={props.id}
            layoutOrder={props.layoutOrder}
            dragHandleRef={dragHandleRef}
            cancelEditMode={() => setEditMode(false)}
          />
        ) : (
          <div
            className={cn(
              classes.wrapper,
              !props.isBaseContainer && classes.formGroupWrapper,
              expanded && classes.expanded
            )}
          >
            {!props.isBaseContainer && (<FormGroupHeader dragHandleRef={dragHandleRef} />)}
            {expanded && components &&
              (items.length ? (
                items.map((itemId: string, index: number) => {
                  const component = components[itemId];
                  if (component) {
                    return (
                      <FormComponent
                        key={itemId}
                        id={itemId}
                        containerId={props.id}
                        index={index}
                        dndEvents={props.dndEvents}
                        partOfGroup={!props.isBaseContainer}
                      />
                    );
                  }
                  return containers[itemId] && (
                    <Container
                      id={itemId}
                      parentContainerId={props.id}
                      key={itemId}
                      index={index}
                      isBaseContainer={false}
                      layoutOrder={props.layoutOrder}
                      dndEvents={props.dndEvents}
                      canDrag={true}
                    />
                  );
                })
              ) : (
                <EmptyContainerPlaceholder containerId={props.id} dndEvents={props.dndEvents} />
              ))}
          </div>
        )
      }
    />
  );
};
