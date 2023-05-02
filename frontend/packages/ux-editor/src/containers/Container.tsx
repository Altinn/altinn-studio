import React, { useState } from 'react';
import '../styles/index.css';
import { FormComponent } from '../components/FormComponent';
import type {
  IDataModelFieldElement,
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
} from '../types/global';
import { DroppableDraggableComponent } from './DroppableDraggableComponent';
import { DroppableDraggableContainer } from './DroppableDraggableContainer';
import type { EditorDndEvents } from './helpers/dnd-types';
import {
  Button,
  ButtonColor,
  ButtonVariant,
} from '@digdir/design-system-react';
import classes from './Container.module.css';
import cn from 'classnames';
import { ChevronUpIcon, TrashIcon, PencilIcon, ChevronDownIcon } from '@navikt/aksel-icons';
import { DragHandle } from '../components/DragHandle';
import { useDeleteFormContainerMutation } from '../hooks/mutations/useDeleteFormContainerMutation';
import { ITextResource } from 'app-shared/types/global';
import { useText } from '../hooks/useText';
import { useParams } from 'react-router-dom';
import { EditFormGroup } from '../components/EditFormGroup';

export interface IContainerProps {
  isBaseContainer?: boolean;
  id: string;
  index?: number;
  layoutOrder?: IFormLayoutOrder;
  dndEvents: EditorDndEvents;
  canDrag: boolean;
  dataModel: IDataModelFieldElement[];
  components: IFormDesignerComponents;
  containers: IFormDesignerContainers;
  textResources: ITextResource[];
}

export const Container = (props: IContainerProps) => {
  const t = useText();

  const { org, app } = useParams();

  const deleteFormContainerMutation = useDeleteFormContainerMutation(org, app);

  const [editMode, setEditMode] = useState<boolean>(false);
  const [expanded, setExpanded] = useState<boolean>(true);

  const items = props.layoutOrder[props.id];

  const handleContainerDelete = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    deleteFormContainerMutation.mutate(props.id);
  };

  const handleExpand = () => {
    setExpanded((prevState: boolean) => !prevState);
  };

  const handleEditMode = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setEditMode((prevState) => !prevState);
  };

  const renderContainerPlaceholder = () => {
    return (
      <DroppableDraggableComponent
        dndEvents={props.dndEvents}
        canDrag={false}
        id='placeholder'
        index={0}
        containerId={props.id}
        component={() => (
          <p className={classes.emptyContainerText}>
            {t('ux_editor.container_empty')}
          </p>
        )}
      />
    );
  };

  const renderHoverIcons = (): JSX.Element => (
    <>
      <Button
        icon={<TrashIcon title={t('general.delete')} />}
        onClick={handleContainerDelete}
        variant={ButtonVariant.Quiet}
      />
      <Button
        icon={<PencilIcon title={t('general.edit')} />}
        onClick={handleEditMode}
        variant={ButtonVariant.Quiet}
      />
    </>
  );

  const renderContainer = (id: string, index: number): JSX.Element => {
    return (
      <Container
        id={id}
        key={id}
        index={index}
        isBaseContainer={false}
        layoutOrder={props.layoutOrder}
        dndEvents={props.dndEvents}
        canDrag={true}
        dataModel={props.dataModel}
        components={props.components}
        containers={props.containers}
        textResources={props.textResources}
      />
    );
  };

  const renderFormComponent = (id: string, index: number): JSX.Element => {
    return (
      <DroppableDraggableComponent
        canDrag
        containerId={props.id}
        dndEvents={props.dndEvents}
        id={id}
        index={index}
        key={id}
        component={(dragHandleRef) => (
          <FormComponent
            id={id}
            partOfGroup={!props.isBaseContainer}
            dragHandleRef={dragHandleRef}
          />
        )}
      />
    );
  };

  return (
    <DroppableDraggableContainer
      id={props.id}
      index={props.index}
      isBaseContainer={props.isBaseContainer}
      parentContainerId={props.id}
      canDrag={props.canDrag}
      dndEvents={props.dndEvents}
      key={props.id}
      container={(dragHandleRef) => (
        editMode ?
        <EditFormGroup
          id={props.id}
          layoutOrder={props.layoutOrder}
          dataModel={props.dataModel}
          components={props.components}
          containers={props.containers}
          textResources={props.textResources}
          dragHandleRef={dragHandleRef}
          setEditMode={setEditMode}
        />
        :
        <div
          className={cn(
            classes.wrapper,
            !props.isBaseContainer && classes.formGroupWrapper,
            expanded && classes.expanded
          )}
        >
          {!props.isBaseContainer && (
            <div className={classes.formGroup} data-testid='form-group'>
              <div ref={dragHandleRef} className={classes.dragHandle}>
                <DragHandle />
              </div>
              <div className={classes.formGroupBar}>
                <Button
                  color={ButtonColor.Secondary}
                  icon={expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                  onClick={handleExpand}
                  variant={ButtonVariant.Quiet}
                />
                Gruppe - ${props.id}
              </div>
              <div className={classes.formGroupButtons}>{renderHoverIcons()}</div>
            </div>
          )}
          {expanded &&
            props.components &&
            (items.length
              ? items.map((itemId: string, index: number) => {
                  const component = props.components[itemId];
                  if (component) {
                    return renderFormComponent(itemId, index);
                  }
                  return props.containers[itemId] && renderContainer(itemId, index);
                })
              : renderContainerPlaceholder())}
        </div>
      )}
    />
  );
}
