import React, { useState, type ReactElement } from 'react';
import classes from './EditColumnElement.module.css';
import type { TableColumn } from '../../types/TableColumn';
import { useTranslation } from 'react-i18next';
import { StudioCard, StudioCombobox, StudioDivider } from '@studio/components-legacy';
import { StudioParagraph, StudioActionCloseButton, StudioDeleteButton } from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import type { FormItem } from '../../../../../types/FormItem';
import { EditColumnElementContent } from './EditColumnElementContent';
import {
  getComponentsForSubformTable,
  getDefaultDataModel,
} from '../../utils/editSubformTableColumnsUtils';
import { convertDataBindingToInternalFormat } from '../../../../../utils/dataModelUtils';
import { DataModelBindingsCombobox } from './DataModelBindingsCombobox';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import type { IDataModelBindingsKeyValue } from '../../../../../types/global';

export type EditColumnElementProps = {
  tableColumn: TableColumn;
  columnNumber: number;
  onDeleteColumn: () => void;
  onChange: (tableColumn: TableColumn) => void;
  onClose: () => void;
  subformLayout: string;
};

export const EditColumnElement = ({
  tableColumn,
  columnNumber,
  onDeleteColumn,
  onChange,
  onClose,
  subformLayout,
}: EditColumnElementProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, subformLayout);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const [selectedComponentId, setSelectedComponentId] = useState<string>();

  const selectComponent = (values: string[]) => {
    const componentId = values[0];
    setSelectedComponentId(componentId);

    const selectedComponent = availableComponents.find((comp) => comp.id === componentId);

    const bindingKey = Object.keys(selectedComponent.dataModelBindings)[0];

    const binding = convertDataBindingToInternalFormat(
      selectedComponent?.dataModelBindings?.[bindingKey],
    );

    onChange({
      ...tableColumn,
      headerContent: selectedComponent.textResourceBindings?.title,
      cellContent: { query: binding.field },
    });
  };

  const handleBindingChange = (
    dataModelBindings: IDataModelBindingsKeyValue,
    dataModelBindingKey: string,
  ) => {
    const { field } = convertDataBindingToInternalFormat(dataModelBindings[dataModelBindingKey]);
    const updatedTableColumn = {
      ...tableColumn,
      cellContent: { query: field },
    };
    onChange(updatedTableColumn);
  };

  const subformDefaultDataModel = getDefaultDataModel(layoutSets, subformLayout);
  const availableComponents = getComponentsForSubformTable(formLayouts, subformDefaultDataModel);
  const isSaveButtonDisabled = !tableColumn.headerContent || !tableColumn.cellContent?.query;

  const component = availableComponents.find((comp) => comp.id === selectedComponentId);
  const dataModelBindingKeys = Object.keys(component?.dataModelBindings ?? {});
  const hasMultipleDataModelBindings = dataModelBindingKeys.length > 1;
  const isTableColumnDefined = tableColumn.headerContent || tableColumn.cellContent?.query;

  return (
    <StudioCard className={classes.wrapper}>
      <EditColumnElementHeader columnNumber={columnNumber} />
      <StudioCard.Content className={classes.content}>
        <EditColumnElementComponentSelect
          components={availableComponents}
          onSelectComponent={selectComponent}
        />
        {hasMultipleDataModelBindings && (
          <DataModelBindingsCombobox
            componentType={component?.type}
            dataModelBindings={component?.dataModelBindings}
            onDataModelBindingChange={(dataModelBindingKey: string) =>
              handleBindingChange(component?.dataModelBindings, dataModelBindingKey)
            }
            initialDataModelBindingKey={dataModelBindingKeys[0]}
          />
        )}
        {isTableColumnDefined && (
          <EditColumnElementContent
            subformLayout={subformLayout}
            tableColumn={tableColumn}
            onChange={onChange}
          />
        )}
        <div className={classes.buttons}>
          <StudioActionCloseButton
            data-size='2xs'
            onClick={onClose}
            title={t('general.save')}
            disabled={isSaveButtonDisabled}
          />
          <StudioDeleteButton
            data-size='2xs'
            title={t('general.delete')}
            onDelete={onDeleteColumn}
          />
        </div>
      </StudioCard.Content>
    </StudioCard>
  );
};

type EditColumnElementHeaderProps = {
  columnNumber: number;
};
const EditColumnElementHeader = ({ columnNumber }: EditColumnElementHeaderProps) => {
  const { t } = useTranslation();
  return (
    <>
      <StudioCard.Header className={classes.header}>
        <StudioParagraph data-size='md'>
          {t('ux_editor.properties_panel.subform_table_columns.column_header', { columnNumber })}
        </StudioParagraph>
      </StudioCard.Header>
      <StudioDivider className={classes.divider} color='subtle' />
    </>
  );
};

export type EditColumnElementComponentSelectProps = {
  components: FormItem[];
  onSelectComponent: (values: string[]) => void;
};
export const EditColumnElementComponentSelect = ({
  components,
  onSelectComponent,
}: EditColumnElementComponentSelectProps) => {
  const { t } = useTranslation();

  return (
    <StudioCombobox
      label={t('ux_editor.properties_panel.subform_table_columns.choose_component')}
      description={t(
        'ux_editor.properties_panel.subform_table_columns.choose_component_description',
      )}
      size='sm'
      onValueChange={onSelectComponent}
      id='columncomponentselect'
    >
      {components.map((comp: FormItem) => (
        <StudioCombobox.Option key={comp.id} value={comp.id} description={comp.type}>
          {comp.id}
        </StudioCombobox.Option>
      ))}
      <StudioCombobox.Empty key={'noComponentsWithLabel'}>
        {t('ux_editor.properties_panel.subform_table_columns.no_components_available_message')}
      </StudioCombobox.Empty>
    </StudioCombobox>
  );
};
