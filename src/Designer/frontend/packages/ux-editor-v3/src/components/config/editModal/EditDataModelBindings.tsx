import type { IGenericEditComponent } from '../componentConfig';
import { getMinOccursFromDataModel, getXsdDataTypeFromDataModel } from '../../../utils/dataModel';
import { ComponentTypeV3 } from 'app-shared/types/ComponentTypeV3';
import React, { useEffect, useState } from 'react';
import { useText } from '../../../hooks';
import { SelectDataModelComponent } from '../SelectDataModelComponent';
import { useDataModelMetadataQuery } from '../../../hooks/queries/useDataModelMetadataQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { LinkIcon } from '@studio/icons';
import { StudioButton } from '@studio/components';
import classes from './EditDataModelBindings.module.css';
import { InputActionWrapper } from './InputActionWrapper';
import { useAppContext } from '../../../hooks/useAppContext';

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
  const { org, app } = useStudioEnvironmentParams();
  const { selectedLayoutSet } = useAppContext();
  const { data } = useDataModelMetadataQuery(org, app, selectedLayoutSet, undefined);
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
        component.type === ComponentTypeV3.Datepicker
          ? getXsdDataTypeFromDataModel(selectedDataModelElement, data) === 'DateTime'
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

  return (
    <div key={uniqueKey || ''}>
      {!selectedOption && !dataModelSelectVisible ? (
        <StudioButton onClick={() => setDataModelSelectVisible(true)} variant='tertiary' fullWidth>
          <div className={classes.dataModelLink}>
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
                selectedElement={
                  component.dataModelBindings
                    ? component.dataModelBindings[key || 'simpleBinding']
                    : undefined
                }
                onDataModelChange={(dataModelField: string) => {
                  handleDataModelChange(dataModelField, key);
                }}
                noOptionsMessage={t('general.no_options')}
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
    <div className={classes.linkedDataModelContainer}>
      <LinkIcon className={classes.linkedDataModelIcon} />
      {selectedOption}
    </div>
  );
};
