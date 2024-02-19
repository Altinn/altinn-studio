import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import classes from './RepeatingGroupComponent.module.css';
import { Checkbox, LegacyFieldSet, LegacyTextField } from '@digdir/design-system-react';
import { FormField } from '../../../FormField';
import { EditGroupDataModelBindings } from '../../group/EditGroupDataModelBindings';
import { getTextResource } from '../../../../utils/language';
import { useSelectedFormLayout, useText, useTextResourcesSelector } from '../../../../hooks';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../../hooks/useAppContext';
import { useFormLayoutsQuery } from '../../../../hooks/queries/useFormLayoutsQuery';
import { useDatamodelMetadataQuery } from '../../../../hooks/queries/useDatamodelMetadataQuery';
import type { ITextResource } from 'app-shared/types/global';
import { textResourcesByLanguageSelector } from '../../../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { selectedLayoutNameSelector } from '../../../../selectors/formLayoutSelectors';
import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import type { IEditFormComponentProps } from '../../EditFormComponent';

export const RepeatingGroupComponent = ({
  component,
  handleComponentUpdate,
}: IEditFormComponentProps) => {
  const t = useText();

  const { org, app } = useStudioUrlParams();

  const { selectedLayoutSet } = useAppContext();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data: dataModel } = useDatamodelMetadataQuery(org, app);
  const { components } = useSelectedFormLayout();
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE),
  );

  const [tableHeadersError, setTableHeadersError] = useState<string>(null);

  const selectedLayout = useSelector(selectedLayoutNameSelector);
  const layoutOrder = formLayouts?.[selectedLayout]?.order || {};

  const items = layoutOrder[component.id];

  const handleMaxOccurChange = (maxOcc: number) => {
    if (maxOcc < 2) {
      maxOcc = 2;
    }
    handleComponentUpdate({
      ...component,
      maxCount: maxOcc,
    });
  };

  const handleTableHeadersChange = (ids: string[]) => {
    const updatedContainer = { ...component };
    updatedContainer.tableHeaders = [...ids];
    if (updatedContainer.tableHeaders?.length === items.length) {
      // table headers is the same as children. We ignore the table header prop
      updatedContainer.tableHeaders = undefined;
    }
    let errorMessage;
    if (updatedContainer.tableHeaders?.length === 0) {
      errorMessage = t('ux_editor.modal_properties_group_table_headers_error');
    }

    handleComponentUpdate(updatedContainer);
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
    handleComponentUpdate({
      ...component,
      dataModelBindings: {
        [key]: dataBindingName,
      },
      maxCount: maxOccurs,
    });
  };

  return (
    <div className={classes.root}>
      <LegacyFieldSet className={classes.fieldset}>
          <EditGroupDataModelBindings
            dataModelBindings={component.dataModelBindings}
            onDataModelChange={handleDataModelGroupChange}
          />
          <FormField
            id={component.id}
            label={t('ux_editor.modal_properties_group_max_occur')}
            onChange={handleMaxOccurChange}
            value={component.maxCount}
            propertyPath={`${component.propertyPath}/properties/maxCount`}
            renderField={({ fieldProps }) => (
              <LegacyTextField
                {...fieldProps}
                id='modal-properties-maximum-files'
                disabled={!!component.dataModelBindings?.group}
                formatting={{ number: {} }}
                onChange={(e) => fieldProps.onChange(parseInt(e.target.value), e)}
              />
            )}
          />
          {items?.length > 0 && (
            <FormField
              id={component.id}
              value={items}
              onChange={handleTableHeadersChange}
              propertyPath={`${component.propertyPath}/properties/tableHeaders`}
              renderField={({ fieldProps }) => {
                const filteredItems = items.filter((id) => !!components[id]);
                const checkboxes = filteredItems.map((id) => ({
                  id,
                  name: id,
                  checked:
                    component.tableHeaders === undefined || component.tableHeaders.includes(id),
                }));
                return (
                  <Checkbox.Group
                    {...fieldProps}
                    error={tableHeadersError}
                    legend={t('ux_editor.modal_properties_group_table_headers')}
                  >
                    {checkboxes.map(({ id, name, checked }) => (
                      <Checkbox key={id} name={name} checked={checked} value={id}>
                        {getTextResource(
                          components[id]?.textResourceBindings?.title,
                          textResources,
                        ) || id}
                      </Checkbox>
                    ))}
                  </Checkbox.Group>
                );
              }}
            />
          )}
      </LegacyFieldSet>
    </div>
  );
};
