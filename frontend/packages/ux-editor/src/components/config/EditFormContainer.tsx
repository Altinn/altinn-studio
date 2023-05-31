import React, { ChangeEvent, useCallback, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import '../../styles/index.css';
import { EditGroupDataModelBindings } from './group/EditGroupDataModelBindings';
import { getTextResource } from '../../utils/language';
import { idExists, validComponentId } from '../../utils/formLayoutUtils';
import { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { Checkbox, CheckboxGroup, FieldSet, TextField } from '@digdir/design-system-react';
import classes from './EditFormContainer.module.css';
import { TextResource } from '../TextResource';
import { useDatamodelQuery } from '../../hooks/queries/useDatamodelQuery';
import { useText } from '../../hooks';
import { useParams } from 'react-router-dom';
import { useFormLayoutsSelector, useTextResourcesSelector } from '../../hooks';
import { selectedLayoutSelector } from '../../selectors/formLayoutSelectors';
import { textResourcesByLanguageSelector } from '../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { ITextResource } from 'app-shared/types/global';
import {
  selectedLayoutNameSelector,
  selectedLayoutSetSelector,
} from '../../selectors/formLayoutSelectors';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { TextFieldWithValidation } from '../TextFieldWithValidation';
import { FormContainer } from '../../types/FormContainer';

export interface IEditFormContainerProps {
  editFormId: string;
  container: FormContainer;
  handleContainerUpdate: React.Dispatch<React.SetStateAction<FormContainer>>;
}

export const EditFormContainer = ({
  editFormId,
  container,
  handleContainerUpdate,
}: IEditFormContainerProps) => {
  const t = useText();

  const { org, app } = useParams();

  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedLayoutSetName);
  const { data: dataModel } = useDatamodelQuery(org, app);
  const { components, containers } = useFormLayoutsSelector(selectedLayoutSelector);
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE)
  );

  const [tmpId, setTmpId] = useState<string>(container.id);
  const [tableHeadersError, setTableHeadersError] = useState<string>(null);

  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const layoutOrder = formLayouts?.[selectedLayout]?.order || {};

  const items = layoutOrder[editFormId];

  useEffect(() => {
    setTmpId(container.id);
  }, [container.id]);

  const handleChangeRepeatingGroup = () => {
    handleContainerUpdate((prevState) => {
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
    handleContainerUpdate((prevState) => ({
      ...prevState,
      maxCount: maxOcc,
    }));
  };

  const handleButtonTextChange = (id: string) => {
    handleContainerUpdate((prevState) => ({
      ...prevState,
      textResourceBindings: {
        ...prevState.textResourceBindings,
        add_button: id,
      },
    }));
  };

  const handleTableHeadersChange = (ids: string[]) => {
    const updatedContainer = { ...container };
    updatedContainer.tableHeaders = [...ids];
    if (updatedContainer.tableHeaders?.length === items.length) {
      // table headers is the same as children. We ignore the table header prop
      updatedContainer.tableHeaders = undefined;
    }
    let errorMessage;
    if (updatedContainer.tableHeaders?.length === 0) {
      errorMessage = t('ux_editor.modal_properties_group_table_headers_error');
    }

    handleContainerUpdate(updatedContainer);
    setTableHeadersError(errorMessage);
  };

  const getMaxOccursForGroupFromDataModel = useCallback(
    (dataBindingName: string): number => {
      const element: DatamodelFieldElement = dataModel.find((e: DatamodelFieldElement) => {
        return e.dataBindingName === dataBindingName;
      });
      return element?.maxOccurs;
    },
    [dataModel]
  );

  const handleDataModelGroupChange = useCallback(
    (dataBindingName: string, key: string) => {
      const maxOccurs = getMaxOccursForGroupFromDataModel(dataBindingName);
      handleContainerUpdate((prevState) => ({
        ...prevState,
        dataModelBindings: {
          [key]: dataBindingName,
        },
        maxCount: maxOccurs,
      }));
    },
    [getMaxOccursForGroupFromDataModel, handleContainerUpdate]
  );

  const handleNewId = (_, error) => {
    if (!error) {
      handleContainerUpdate((prevState) => ({
        ...prevState,
        id: tmpId,
      }));
    }
  };

  const handleIdChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newId = event.target.value;
    setTmpId(newId);
  };

  return (
    <FieldSet className={classes.fieldset}>
      <div>
        <TextFieldWithValidation
          label={t('ux_editor.modal_properties_group_change_id')}
          name={`group-id${container.id}`}
          value={tmpId}
          validation={{
            required: {
              message: t('validation_errors.required'),
            },
            custom: (value) => {
              if (idExists(value, components, containers) && value !== container.id) {
                return t('ux_editor.modal_properties_group_id_not_unique_error');
              } else if (!value || !validComponentId.test(value)) {
                return t('ux_editor.modal_properties_group_id_not_valid');
              }
            },
          }}
          onChange={handleIdChange}
          onBlur={handleNewId}
        />
      </div>
      <Checkbox
        checked={container.maxCount > 1}
        label={t('ux_editor.modal_properties_group_repeating')}
        onChange={handleChangeRepeatingGroup}
      />
      {container.maxCount > 1 && (
        <>
          <EditGroupDataModelBindings
            dataModelBindings={container.dataModelBindings}
            onDataModelChange={handleDataModelGroupChange}
          />
          <div>
            <TextField
              disabled={!!container.dataModelBindings?.group}
              formatting={{ number: {} }}
              id='modal-properties-maximum-files'
              label={t('ux_editor.modal_properties_group_max_occur')}
              onChange={handleMaxOccurChange}
              value={container.maxCount.toString()}
            />
          </div>
          <TextResource
            description={t('ux_editor.modal_properties_group_add_button_description')}
            handleIdChange={handleButtonTextChange}
            label={t('ux_editor.modal_properties_group_add_button')}
            textResourceId={container.textResourceBindings?.add_button}
          />
          {items.length > 0 && (
            <CheckboxGroup
              error={tableHeadersError}
              items={items.map((id) => ({
                label: getTextResource(components[id].textResourceBindings?.title, textResources),
                name: id,
                checked:
                  container.tableHeaders === undefined || container.tableHeaders.includes(id),
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
