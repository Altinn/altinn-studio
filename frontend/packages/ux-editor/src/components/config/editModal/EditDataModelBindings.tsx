import type { IGenericEditComponent } from '../componentConfig';
import {
  getMaxOccursFromDataModel,
  getMinOccursFromDataModel,
  getXsdDataTypeFromDataModel,
} from '../../../utils/datamodel';
import { ComponentType } from 'app-shared/types/ComponentType';
import React, { useEffect, useState } from 'react';
import { useText } from '../../../hooks';
import { SelectDataModelComponent } from '../SelectDataModelComponent';
import { useDatamodelMetadataQuery } from '../../../hooks/queries/useDatamodelMetadataQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { LinkIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';
import classes from './EditDataModelBindings.module.css';
import { InputActionWrapper } from 'app-shared/components/InputActionWrapper';
import type { FormItem } from '../../../types/FormItem';

export interface EditDataModelBindingsProps<T extends ComponentType>
  extends IGenericEditComponent<T> {
  renderOptions?: {
    label?: string;
    returnValue?: any;
    key?: string;
    uniqueKey?: any;
  };
  helpText?: string;
}

export const EditDataModelBindings = <T extends ComponentType = ComponentType>({
  component,
  handleComponentChange,
  renderOptions,
  helpText,
}: EditDataModelBindingsProps<T>) => {
  const { org, app } = useStudioUrlParams();
  const { data } = useDatamodelMetadataQuery(org, app);
  const t = useText();

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
    } as FormItem<T>);
  };

  const { uniqueKey, key, label } = renderOptions || {};

  const [dataModelSelectVisible, setDataModelSelectVisible] = useState(false);

  useEffect(() => {
    setDataModelSelectVisible(false);
  }, [component.id]);

  const selectedOption = component.dataModelBindings
    ? component.dataModelBindings[key || 'simpleBinding']
    : undefined;

  return (
    <div key={uniqueKey || ''} className={classes.wrapper}>
      {!selectedOption && !dataModelSelectVisible ? (
        <StudioButton
          onClick={() => setDataModelSelectVisible(true)}
          variant='tertiary'
          size='medium'
          fullWidth
        >
          <div className={classes.datamodelLink}>
            <LinkIcon className={classes.linkIcon} />
            {t('ux_editor.modal_properties_data_model_link')}
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
                label={
                  label
                    ? `${t('ux_editor.modal_properties_data_model_helper')} ${t(
                        'general.for',
                      )} ${label}`
                    : t('ux_editor.modal_properties_data_model_helper')
                }
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
