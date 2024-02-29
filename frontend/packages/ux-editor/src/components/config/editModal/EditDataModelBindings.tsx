import type { IGenericEditComponent } from '../componentConfig';
import {
  getDataModelFieldsFilter,
  getMaxOccursFromDataModel,
  getMinOccursFromDataModel,
  getXsdDataTypeFromDataModel,
} from '../../../utils/datamodel';
import { ComponentType } from 'app-shared/types/ComponentType';
import React, { useEffect, useState } from 'react';
import { SelectDataModelComponent } from '../SelectDataModelComponent';
import { useDatamodelMetadataQuery } from '../../../hooks/queries/useDatamodelMetadataQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { LinkIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';
import classes from './EditDataModelBindings.module.css';
import { InputActionWrapper } from 'app-shared/components/InputActionWrapper';
import { useTranslation } from 'react-i18next';

export interface EditDataModelBindingsProps extends IGenericEditComponent {
  renderOptions?: {
    label?: string;
    returnValue?: any;
    key?: string;
    uniqueKey?: any;
  };
  helpText?: string;
}

export const EditDataModelBindings = ({
  component,
  handleComponentChange,
  renderOptions,
  helpText,
}: EditDataModelBindingsProps) => {
  const { org, app } = useStudioUrlParams();
  const { data } = useDatamodelMetadataQuery(org, app);
  const { t } = useTranslation();
  
  const handleDataModelChange = (selectedDataModelElement: string, key = 'simpleBinding') => {
    handleComponentChange({
      ...component,
      dataModelBindings: {
        ...component.dataModelBindings,
        [key]: selectedDataModelElement,
      },
      required: getMinOccursFromDataModel(selectedDataModelElement, data) > 0,
      timeStamp:
        component.type === ComponentType.Datepicker
          ? getXsdDataTypeFromDataModel(selectedDataModelElement, data) === 'DateTime'
          : undefined,
      maxCount:
        component.type === ComponentType.RepeatingGroup
          ? getMaxOccursFromDataModel(selectedDataModelElement, data)
          : undefined,
    });
  };

  const { uniqueKey, key, label } = renderOptions || {};

  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  useEffect(() => {
    setDataModelSelectVisible(false);
  }, [component.id]);

  const selectedOption = component.dataModelBindings
    ? component.dataModelBindings[key || 'simpleBinding']
    : undefined;

  const labelSpecificText = label
    ? t(`ux_editor.modal_properties_data_model_label.${label}`)
    : t(`ux_editor.component_title.${component.type}`);

  return (
    <div
      key={uniqueKey || ''}
      className={dataModelSelectVisible ? classes.editDatamodelWrapper : classes.wrapper}
    >
      {!selectedOption && !dataModelSelectVisible ? (
        <StudioButton
          onClick={() => setDataModelSelectVisible(true)}
          variant='tertiary'
          size='small'
          fullWidth
        >
          <div className={classes.datamodelLink}>
            <LinkIcon className={classes.linkIcon} />
            {labelSpecificText}
          </div>
        </StudioButton>
      ) : (
        <InputActionWrapper
          mode={dataModelSelectVisible ? 'editMode' : 'standBy'}
          onEditClick={() => setDataModelSelectVisible(true)}
          onDeleteClick={() => {
            handleDataModelChange('', key);
            setDataModelSelectVisible(false);
          }}
          onSaveClick={() => setDataModelSelectVisible(false)}
        >
          <>
            {dataModelSelectVisible ? (
              <SelectDataModelComponent
                propertyPath={`definitions/component/properties/dataModelBindings/properties/${
                  key || 'simpleBinding'
                }`}
                label={labelSpecificText}
                componentType={component.type}
                inputId={`selectDataModelSelect-${label}`}
                dataModelFieldsFilter={getDataModelFieldsFilter(component.type, label === 'list')}
                selectedElement={
                  component.dataModelBindings
                    ? component.dataModelBindings[key || 'simpleBinding']
                    : undefined
                }
                onDataModelChange={(dataModelField: string) => {
                  handleDataModelChange(dataModelField, key);
                }}
                helpText={helpText}
              />
            ) : (
              selectedOption && (
                  <StudioButton
                      onClick={() => setDataModelSelectVisible(true)}
                      variant='tertiary'
                      size='small'
                      fullWidth
                      className={classes.labelAndSelectedOption}
                  >
                    <strong>{labelSpecificText}</strong>
                    <div className={classes.selectedOption}>
                      <LinkIcon className={classes.linkIcon} />
                      {selectedOption}
                    </div>
                  </StudioButton>
              )
            )}
          </>
        </InputActionWrapper>
      )}
    </div>
  );
};
