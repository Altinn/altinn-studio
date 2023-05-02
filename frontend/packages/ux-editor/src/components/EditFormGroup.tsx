import React, { ChangeEvent, useCallback, useRef, useState } from 'react';
import '../styles/index.css';
import ErrorPopover from 'app-shared/components/ErrorPopover';
import { EditGroupDataModelBindings } from '../components/config/group/EditGroupDataModelBindings';
import { getTextResource } from '../utils/language';
import { idExists, validComponentId } from '../utils/formLayoutUtils';
import type {
  ICreateFormContainer,
  IDataModelFieldElement,
  IFormDesignerComponents,
  IFormDesignerContainers,
  IFormLayoutOrder,
} from '../types/global';
import {
  Button,
  ButtonVariant,
  Checkbox,
  CheckboxGroup,
  FieldSet,
  TextField,
} from '@digdir/design-system-react';
import classes from './Container.module.css';
import { XMarkIcon, CheckmarkIcon } from '@navikt/aksel-icons';
import { ConnectDragSource } from 'react-dnd';
import { DragHandle } from '../components/DragHandle';
import { TextResource } from '../components/TextResource';
import { useUpdateFormContainerMutation } from '../hooks/mutations/useUpdateFormContainerMutation';
import { useUpdateContainerIdMutation } from '../hooks/mutations/useUpdateContainerIdMutation';
import { ITextResource } from 'app-shared/types/global';
import { useText } from '../hooks/useText';
import { useParams } from 'react-router-dom';

export interface IEditFormGroupProps {
  id: string;
  layoutOrder?: IFormLayoutOrder;
  dataModel: IDataModelFieldElement[];
  components: IFormDesignerComponents;
  containers: IFormDesignerContainers;
  textResources: ITextResource[];
  dragHandleRef: ConnectDragSource;
  setEditMode: (editMode: boolean) => void;
}

export const EditFormGroup = (props: IEditFormGroupProps) => {
  const t = useText();

  const { org, app } = useParams();

  const updateFormContainerMutation = useUpdateFormContainerMutation(org, app);
  const updateContainerIdMutation = useUpdateContainerIdMutation(org, app);

  const [tmpContainer, setTmpContainer] = useState<ICreateFormContainer>(props.containers[props.id]);
  const [tmpId, setTmpId] = useState<string>(props.id);
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

  const handleDiscard = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    props.setEditMode(false);
    setTmpContainer(props.containers[props.id])
    setTmpId(props.id)
  };

  const handleSave = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    event.stopPropagation();
    if (tmpId && tmpId !== props.id) {
      if (idExists(tmpId, props.components, props.containers)) {
        setGroupIdError(t('ux_editor.modal_properties_group_id_not_unique_error'));
      } else if (!validComponentId.test(tmpId)) {
        setGroupIdError(t('ux_editor.modal_properties_group_id_not_valid'));
      } else {
        updateFormContainerMutation.mutate({
          updatedContainer: tmpContainer,
          id: props.id,
        });
        updateContainerIdMutation.mutate({
          currentId: props.id,
          newId: tmpId,
        });
        props.setEditMode(false);
      }
    } else if (tmpContainer.tableHeaders?.length === 0) {
      setTableHeadersError(t('ux_editor.modal_properties_group_table_headers_error'));
    } else {
      // No validations, save.
      updateFormContainerMutation.mutate({
        updatedContainer: tmpContainer,
        id: props.id,
      });
      props.setEditMode(false)
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

  return (
    <div className={classes.editModeWrapper} role={'listitem'}>
      <div className={classes.editModeSectionWithHandle}>
        <div className={classes.editModeHandle} ref={props.dragHandleRef}>
          <DragHandle />
        </div>
        <div className={classes.editModeSection}>{renderEditSection()}</div>
      </div>
      <div className={classes.editModeButtons}>{renderEditIcons()}</div>
    </div>
  );
}
