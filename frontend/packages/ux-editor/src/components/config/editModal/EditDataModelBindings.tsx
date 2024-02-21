import type { IGenericEditComponent } from '../componentConfig';
import {
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
    ? t('general.for') + ' ' + t(`ux_editor.modal_properties_data_model_label.${label}`)
    : '';

  return (
    <div key={uniqueKey || ''}>
      {!selectedOption && !dataModelSelectVisible ? (
        <StudioButton
          onClick={() => setDataModelSelectVisible(true)}
          variant='tertiary'
          size='medium'
          fullWidth
        >
          <div className={classes.datamodelLink}>
            <LinkIcon className={classes.linkIcon} />
            {`${t('ux_editor.modal_properties_data_model_link')} ${labelSpecificText}`}
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
          <div className={classes.selectDataModelComponent}>
            {dataModelSelectVisible ? (
              <SelectDataModelComponent
                propertyPath={`definitions/component/properties/dataModelBindings/properties/${
                  key || 'simpleBinding'
                }`}
                label={`${t('ux_editor.modal_properties_data_model_helper')} ${labelSpecificText}`}
                componentType={component.type}
                inputId={`selectDataModelSelect-${label}`}
                selectGroup={component.type === ComponentType.RepeatingGroup}
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
                <span className={classes.selectedOption}>
                  <SelectedOption selectedOption={selectedOption} />
                </span>
              )
            )}
          </div>
        </InputActionWrapper>
      )}
    </div>
  );
};

const SelectedOption = ({ selectedOption }: { selectedOption: string }) => {
  return (
    <div className={classes.linkedDatamodelContainer}>
      <LinkIcon className={classes.linkedDatamodelIcon} />
      {selectedOption}
    </div>
  );
};
