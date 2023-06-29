import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import '../../styles/index.css';
import { EditGroupDataModelBindings } from './group/EditGroupDataModelBindings';
import { getTextResource } from '../../utils/language';
import { idExists } from '../../utils/formLayoutUtils';
import { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { Checkbox, CheckboxGroup, FieldSet, TextField } from '@digdir/design-system-react';
import classes from './EditFormContainer.module.css';
import { TextResource } from '../TextResource';
import { useDatamodelMetadataQuery } from '../../hooks/queries/useDatamodelMetadataQuery';
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
import { FormField } from '../FormField';
import { FormContainer } from '../../types/FormContainer';

export interface IEditFormContainerProps {
  editFormId: string;
  container: FormContainer;
  handleContainerUpdate: (updatedContainer: FormContainer) => void;
};

export const EditFormContainer = ({
  editFormId,
  container,
  handleContainerUpdate,
}: IEditFormContainerProps) => {
  const t = useText();

  const { org, app } = useParams();

  const selectedLayoutSetName = useSelector(selectedLayoutSetSelector);
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedLayoutSetName);
  const { data: dataModel } = useDatamodelMetadataQuery(org, app);
  const { components, containers } = useFormLayoutsSelector(selectedLayoutSelector);
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE)
  );

  const [tableHeadersError, setTableHeadersError] = useState<string>(null);

  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const layoutOrder = formLayouts?.[selectedLayout]?.order || {};

  const items = layoutOrder[editFormId];

  const handleChangeRepeatingGroup = (isRepeating: boolean) => {
    if (isRepeating) {
      handleContainerUpdate({
        ...container,
        maxCount: 2,
        dataModelBindings: { group: undefined },
      });
    } else {
      // we are disabling the repeating feature, remove datamodelbinding
      handleContainerUpdate({
        ...container,
        dataModelBindings: { group: undefined },
        maxCount: undefined,
        textResourceBindings: undefined,
      });
    }
  };

  const handleMaxOccurChange = (maxOcc: number) => {
    if (maxOcc < 2) {
      maxOcc = 2;
    }
    handleContainerUpdate({
      ...container,
      maxCount: maxOcc,
    });
  };

  const handleButtonTextChange = (id: string) => {
    handleContainerUpdate({
      ...container,
      textResourceBindings: {
        ...container.textResourceBindings,
        add_button: id,
      },
    });
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

  const getMaxOccursForGroupFromDataModel = (dataBindingName: string): number => {
    const element: DatamodelFieldElement = dataModel.find((e: DatamodelFieldElement) => {
      return e.dataBindingName === dataBindingName;
    });
    return element?.maxOccurs;
  };

  const handleDataModelGroupChange = (dataBindingName: string, key: string) => {
    const maxOccurs = getMaxOccursForGroupFromDataModel(dataBindingName);
    handleContainerUpdate({
      ...container,
      dataModelBindings: {
        [key]: dataBindingName,
      },
      maxCount: maxOccurs,
    });
  };

  const handleIdChange = (id: string) => {
    handleContainerUpdate({
      ...container,
      id,
    });
  };

  return (
    <FieldSet className={classes.fieldset}>
      <FormField
        label={t('ux_editor.modal_properties_group_change_id')}
        value={container.id}
        propertyPath='definitions/component/properties/id'
        customValidationRules={(value: string) => {
          if (idExists(value, components, containers) && value !== container.id) {
            return 'unique';
          }
        }}
        customValidationMessages={(errorCode: string) => {
          if (errorCode === "unique") {
            return t('ux_editor.modal_properties_group_id_not_unique_error')
          }
          if (errorCode === "pattern") {
            return t('ux_editor.modal_properties_group_id_not_valid');
          }
        }}
        onChange={handleIdChange}
      >
        {({ onChange }) => <TextField name={`group-id${container.id}`} onChange={(e) => onChange(e.target.value, e)} />}
      </FormField>
      <FormField
        label={t('ux_editor.modal_properties_group_repeating')}
        value={container.maxCount > 1}
        onChange={handleChangeRepeatingGroup}
      >
        {({ value, onChange }) => <Checkbox
          checked={value}
          onChange={(e) => onChange(e.target.checked, e)}
        />}
      </FormField>
      {container.maxCount > 1 && (
        <>
          <EditGroupDataModelBindings
            dataModelBindings={container.dataModelBindings}
            onDataModelChange={handleDataModelGroupChange}
          />
          <FormField
            label={t('ux_editor.modal_properties_group_max_occur')}
            onChange={handleMaxOccurChange}
            value={container.maxCount}
            propertyPath={`${container.propertyPath}/properties/maxCount`}
          >
            {({ onChange }) =>
            <TextField
              id='modal-properties-maximum-files'
              disabled={!!container.dataModelBindings?.group}
              formatting={{ number: {} }}
              onChange={(e) => onChange(parseInt(e.target.value), e)}
            />}
          </FormField>
          <TextResource
            description={t('ux_editor.modal_properties_group_add_button_description')}
            handleIdChange={handleButtonTextChange}
            label={t('ux_editor.modal_properties_group_add_button')}
            textResourceId={container.textResourceBindings?.add_button}
          />
          {items?.length > 0 && (
            <FormField
              onChange={handleTableHeadersChange}
              value={items
                .filter((id) => !!components[id])
                .map((id) => ({
                  label: getTextResource(components[id]?.textResourceBindings?.title, textResources),
                  name: id,
                  checked:
                    container.tableHeaders === undefined || container.tableHeaders.includes(id),
              }))}
              propertyPath={`${container.propertyPath}/properties/tableHeaders`}
            >
              {({ value }) => <CheckboxGroup
                error={tableHeadersError}
                items={value}
                legend={t('ux_editor.modal_properties_group_table_headers')}
              />}
            </FormField>
          )}
        </>
      )}
    </FieldSet>
  );
};
