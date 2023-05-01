import React, { ChangeEvent, useCallback, useRef, useState } from 'react';
import '../styles/index.css';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import { EditGroupDataModelBindings } from '../components/config/group/EditGroupDataModelBindings';
import { FormComponent } from '../components/FormComponent';
import { getTextResource } from '../utils/language';
import { idExists, validComponentId } from '../utils/formLayoutUtils';
import type {
  ICreateFormContainer,
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
  Checkbox,
  CheckboxGroup,
  FieldSet,
  TextField,
} from '@digdir/design-system-react';
import classes from './Container.module.css';
import cn from 'classnames';
import { XMarkIcon, ChevronUpIcon, TrashIcon, PencilIcon, ChevronDownIcon, CheckmarkIcon } from '@navikt/aksel-icons';
import { ConnectDragSource } from 'react-dnd';
import { DragHandle } from '../components/DragHandle';
import { TextResource } from '../components/TextResource';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateContainerIdMutation } from '../hooks/mutations/useUpdateContainerIdMutation';
import { useDeleteFormContainerMutation } from '../hooks/mutations/useDeleteFormContainerMutation';
import { ITextResource } from 'app-shared/types/global';
import { useText } from '../hooks/useText';

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
  updateFormContainerMutation: ReturnType<typeof useUpdateFormContainerMutation>;
  updateContainerIdMutation: ReturnType<typeof useUpdateContainerIdMutation>;
  deleteFormContainerMutation: ReturnType<typeof useDeleteFormContainerMutation>;
  textResources: ITextResource[];
}

export const Container = (props: IContainerProps) => {
  const t = useText();

  const [editMode, setEditMode] = useState<boolean>(false);
  const [tmpContainer, setTmpContainer] = useState<ICreateFormContainer>(props.containers[props.id]);
  const [tmpId, setTmpId] = useState<string>(props.id);
  const [expanded, setExpanded] = useState<boolean>(true);
  const [groupIdError, setGroupIdError] = useState<string>(null);
  const groupIdPopoverRef = useRef<HTMLDivElement>();
  const [tableHeadersError, setTableHeadersError] = useState<string>(null);

  const items = props.layoutOrder[props.id];

  const handleChangeRepeatingGroup = () => {
    setTmpContainer((prevState) => {
      const isRepeating = prevState.maxCount > 0;
      if (isRepeating) {
        // we are disabling the repeating feature, remove datamodelbinding
        return {
          ...prevState,
          dataModelBindings: { group: undefined },
          maxCount: undefined,
          textResourceBindings: undefined,
        };
      } else {
        return { ...prevState, maxCount: 2 };
      }
    });
  };

  const handleMaxOccurChange = (event: any) => {
    let maxOcc = event.target?.value;
    if (maxOcc < 2) {
      maxOcc = 2;
    }
    setTmpContainer((prevState) => ({
      ...prevState,
      maxCount: maxOcc,
    }));
  };

  const handleContainerDelete = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    props.deleteFormContainerMutation.mutate(props.id);
  };

  const handleDiscard = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setEditMode(false);
    setTmpContainer(props.containers[props.id])
    setTmpId(props.id)
  };

  const handleSave = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    if (tmpId && tmpId !== props.id) {
      if (idExists(tmpId, props.components, props.containers)) {
        setGroupIdError(t('ux_editor.modal_properties_group_id_not_unique_error'));
      } else if (!validComponentId.test(tmpId)) {
        setGroupIdError(t('ux_editor.modal_properties_group_id_not_valid'));
      } else {
        props.updateFormContainerMutation.mutate({
          updatedContainer: tmpContainer,
          id: props.id,
        });
        props.updateContainerIdMutation.mutate({
          currentId: props.id,
          newId: tmpId,
        });
        setEditMode(false);
      }
    } else if (tmpContainer.tableHeaders?.length === 0) {
      setTableHeadersError(t('ux_editor.modal_properties_group_table_headers_error'));
    } else {
      // No validations, save.
      props.updateFormContainerMutation.mutate({
        updatedContainer: tmpContainer,
        id: props.id,
      });
      setEditMode(false)
    }
  };

  const handleNewId = (event: ChangeEvent<HTMLInputElement>) => {
    if (
      idExists(event.target.value, props.components, props.containers) &&
      event.target.value !== props.id
    ) {
      setGroupIdError(t('ux_editor.modal_properties_group_id_not_unique_error'));
    } else if (!validComponentId.test(event.target.value)) {
      setGroupIdError(t('ux_editor.modal_properties_group_id_not_valid'));
    } else {
      setGroupIdError(null);
    }
  };

  const handleClosePopup = () => {
    setGroupIdError(null);
    setTableHeadersError(null);
  };

  const handleButtonTextChange = (id: string) => {
    setTmpContainer((prevState) => ({
      ...prevState,
      textResourceBindings: {
        ...prevState.textResourceBindings,
        add_button: id,
      }
    }));
  };

  const handleTableHeadersChange = (ids: string[]) => {
    const updatedContainer = { ...tmpContainer };
    updatedContainer.tableHeaders = [...ids];
    if (updatedContainer.tableHeaders?.length === items.length) {
      // table headers is the same as children. We ignore the table header prop
      updatedContainer.tableHeaders = undefined;
    }
    let errorMessage;
    if (updatedContainer.tableHeaders?.length === 0) {
      errorMessage = t('ux_editor.modal_properties_group_table_headers_error');
    }

    setTmpContainer(updatedContainer);
    setTableHeadersError(errorMessage);
  };

  const getMaxOccursForGroupFromDataModel = useCallback((dataBindingName: string): number => {
    const element: IDataModelFieldElement = props.dataModel.find(
      (e: IDataModelFieldElement) => {
        return e.dataBindingName === dataBindingName;
      }
    );
    return element?.maxOccurs;
  }, [props.dataModel]);

  const handleDataModelGroupChange = useCallback((dataBindingName: string, key: string) => {
    const maxOccurs = getMaxOccursForGroupFromDataModel(dataBindingName);
    setTmpContainer((prevState) => ({
      ...prevState,
      dataModelBindings: {
        [key]: dataBindingName,
      },
      maxCount: maxOccurs,
    }));
  }, [getMaxOccursForGroupFromDataModel]);

  const handleIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTmpId(event.target.value);
  };

  const handleExpand = () => {
    setExpanded((prevState: boolean) => !prevState);
  };

  const handleEditMode = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setEditMode((prevState) => !prevState);
  };

  const renderEditSection = (): JSX.Element => {
    return (
      <FieldSet className={classes.fieldset}>
        <div>
          <TextField
            id='group-id'
            label={t('ux_editor.modal_properties_group_change_id')}
            onBlur={handleNewId}
            onChange={handleIdChange}
            value={tmpId}
          />
          <div ref={groupIdPopoverRef} />
          <ErrorPopover
            anchorEl={groupIdError ? groupIdPopoverRef.current : null}
            onClose={handleClosePopup}
            errorMessage={groupIdError}
          />
        </div>
        <Checkbox
          checked={tmpContainer.maxCount > 1}
          label={t('ux_editor.modal_properties_group_repeating')}
          onChange={handleChangeRepeatingGroup}
        />
        {tmpContainer.maxCount > 1 && (
          <>
            <EditGroupDataModelBindings
              dataModelBindings={tmpContainer.dataModelBindings}
              onDataModelChange={handleDataModelGroupChange}
            />
            <div>
              <TextField
                disabled={!!tmpContainer.dataModelBindings.group}
                formatting={{ number: {} }}
                id='modal-properties-maximum-files'
                label={t('ux_editor.modal_properties_group_max_occur')}
                onChange={handleMaxOccurChange}
                value={tmpContainer.maxCount.toString()}
              />
            </div>
            <TextResource
              description={t('ux_editor.modal_properties_group_add_button_description')}
              handleIdChange={handleButtonTextChange}
              label={t('ux_editor.modal_properties_group_add_button')}
              textResourceId={tmpContainer.textResourceBindings?.add_button}
            />
            {items.length > 0 && (
              <CheckboxGroup
                error={tableHeadersError}
                items={items.map((id) => ({
                  label: getTextResource(props.components[id].textResourceBindings?.title, props.textResources),
                  name: id,
                  checked:
                    tmpContainer.tableHeaders === undefined ||
                    tmpContainer.tableHeaders.includes(id),
                }))}
                legend={t('ux_editor.modal_properties_group_table_headers')}
                onChange={handleTableHeadersChange}
              />
            )}
          </>
        )}
      </FieldSet>
    );
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

  const renderEditMode = (dragHandleRef: ConnectDragSource): JSX.Element => (
    <div className={classes.editModeWrapper} role={'listitem'}>
      <div className={classes.editModeSectionWithHandle}>
        <div className={classes.editModeHandle} ref={dragHandleRef}>
          <DragHandle />
        </div>
        <div className={classes.editModeSection}>{renderEditSection()}</div>
      </div>
      <div className={classes.editModeButtons}>{renderEditIcons()}</div>
    </div>
  );

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

  const renderEditIcons = (): JSX.Element => (
    <>
      <Button
        icon={<XMarkIcon title={t('general.cancel')} />}
        onClick={handleDiscard}
        variant={ButtonVariant.Quiet}
      />
      <Button
        icon={<CheckmarkIcon title={t('general.save')} />}
        onClick={handleSave}
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
        updateFormContainerMutation={props.updateFormContainerMutation}
        updateContainerIdMutation={props.updateContainerIdMutation}
        deleteFormContainerMutation={props.deleteFormContainerMutation}
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
        editMode ? renderEditMode(dragHandleRef) :
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
