import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import '../../styles/index.css';
import { EditGroupDataModelBindings } from './group/EditGroupDataModelBindings';
import { getTextResource } from '../../utils/language';
import { idExists } from '../../utils/formLayoutUtils';
import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { Switch, Checkbox, LegacyFieldSet, LegacyTextField } from '@digdir/design-system-react';
import classes from './EditFormContainer.module.css';
import { TextResource } from '../TextResource';
import { useDatamodelMetadataQuery } from '../../hooks/queries/useDatamodelMetadataQuery';
import { useText } from '../../hooks';
import { useSelectedFormLayout, useTextResourcesSelector } from '../../hooks';
import { textResourcesByLanguageSelector } from '../../selectors/textResourceSelectors';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import type { ITextResource } from 'app-shared/types/global';
import { selectedLayoutNameSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutsQuery } from '../../hooks/queries/useFormLayoutsQuery';
import { FormField } from '../FormField';
import type { FormContainer } from '../../types/FormContainer';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../hooks/useAppContext';

export interface IEditFormContainerProps {
  editFormId: string;
  container: FormContainer;
  handleContainerUpdate: (updatedContainer: FormContainer) => void;
}

export const EditFormContainer = ({
  editFormId,
  container,
  handleContainerUpdate,
}: IEditFormContainerProps) => {
  const t = useText();

  const { org, app } = useStudioUrlParams();

  const { selectedLayoutSet } = useAppContext();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data: dataModel } = useDatamodelMetadataQuery(org, app);
  const { components, containers } = useSelectedFormLayout();
  const textResources: ITextResource[] = useTextResourcesSelector<ITextResource[]>(
    textResourcesByLanguageSelector(DEFAULT_LANGUAGE),
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
    <LegacyFieldSet className={classes.fieldset}>
      <FormField
        id={container.id}
        label={t('ux_editor.modal_properties_group_change_id')}
        value={container.id}
        propertyPath='definitions/component/properties/id'
        customValidationRules={(value: string) => {
          if (value !== container.id && idExists(value, components, containers)) {
            return 'unique';
          }
        }}
        customValidationMessages={(errorCode: string) => {
          if (errorCode === 'unique') {
            return t('ux_editor.modal_properties_group_id_not_unique_error');
          }
          if (errorCode === 'pattern') {
            return t('ux_editor.modal_properties_group_id_not_valid');
          }
        }}
        onChange={handleIdChange}
        renderField={({ fieldProps }) => (
          <LegacyTextField
            {...fieldProps}
            name={`group-id${container.id}`}
            onChange={(e) => fieldProps.onChange(e.target.value, e)}
          />
        )}
      />
      <FormField
        id={container.id}
        value={container.maxCount > 1}
        onChange={handleChangeRepeatingGroup}
        renderField={({ fieldProps }) => (
          <Switch
            {...fieldProps}
            checked={fieldProps.value}
            size='small'
            onChange={(e) => fieldProps.onChange(e.target.checked, e)}
          >
            {t('ux_editor.modal_properties_group_repeating')}
          </Switch>
        )}
      />
      {container.maxCount > 1 && (
        <>
          <EditGroupDataModelBindings
            dataModelBindings={container.dataModelBindings}
            onDataModelChange={handleDataModelGroupChange}
          />
          <FormField
            id={container.id}
            label={t('ux_editor.modal_properties_group_max_occur')}
            onChange={handleMaxOccurChange}
            value={container.maxCount}
            propertyPath={`${container.propertyPath}/properties/maxCount`}
            renderField={({ fieldProps }) => (
              <LegacyTextField
                {...fieldProps}
                id='modal-properties-maximum-files'
                disabled={!!container.dataModelBindings?.group}
                formatting={{ number: {} }}
                onChange={(e) => fieldProps.onChange(parseInt(e.target.value), e)}
              />
            )}
          />
          <TextResource
            description={t('ux_editor.modal_properties_group_add_button_description')}
            handleIdChange={handleButtonTextChange}
            label={t('ux_editor.modal_properties_group_add_button')}
            textResourceId={container.textResourceBindings?.add_button}
          />
          {items?.length > 0 && (
            <FormField
              id={container.id}
              value={items}
              onChange={handleTableHeadersChange}
              propertyPath={`${container.propertyPath}/properties/tableHeaders`}
              renderField={() => {
                const filteredItems = items.filter((id) => !!components[id]);
                const checkboxes = filteredItems.map((id) => ({
                  id,
                  name: id,
                  checked:
                    container.tableHeaders === undefined || container.tableHeaders.includes(id),
                }));
                return (
                  <Checkbox.Group
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
        </>
      )}
    </LegacyFieldSet>
  );
};
