import React, { useState, type ReactElement } from 'react';
import classes from './EditColumnElement.module.css';
import { type TableColumn } from '../../types/TableColumn';
import { useTranslation } from 'react-i18next';
import {
  StudioActionCloseButton,
  StudioCard,
  StudioCombobox,
  StudioDeleteButton,
  StudioDivider,
  StudioParagraph,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import type { FormItem } from '../../../../../types/FormItem';
import { EditColumnElementContent } from './EditColumnElementContent';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useUpsertTextResourceMutation } from 'app-shared/hooks/mutations';
import { useTextIdMutation } from 'app-development/hooks/mutations';
import {
  getComponentsForSubformTable,
  getDefaultDataModel,
  getTitleIdForColumn,
  getValueOfTitleId,
} from '../../utils/editSubformTableColumnsUtils';
import { convertDataBindingToInternalFormat } from '../../../../../utils/dataModelUtils';
import { DataModelBindingsCombobox } from './DataModelBindingsCombobox';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';

export type ColumnElementProps = {
  sourceColumn: TableColumn;
  columnNumber: number;
  onDeleteColumn: () => void;
  onEdit: (tableColumn: TableColumn) => void;
  subformLayout: string;
};

export const EditColumnElement = ({
  sourceColumn,
  columnNumber,
  onDeleteColumn,
  onEdit,
  subformLayout,
}: ColumnElementProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  const [tableColumn, setTableColumn] = useState(sourceColumn);
  const [title, setTitle] = useState<string>(
    getValueOfTitleId(sourceColumn.headerContent, textResources),
  );
  const [uniqueTitleId, _] = useState(
    getTitleIdForColumn({
      titleId: tableColumn.headerContent,
      subformId: subformLayout,
      textResources,
    }),
  );
  const { mutate: upsertTextResource } = useUpsertTextResourceMutation(org, app);
  const { mutate: textIdMutation } = useTextIdMutation(org, app);
  const { data: formLayouts } = useFormLayoutsQuery(org, app, subformLayout);
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const [selectedComponentBindings, setSelectedComponentBindings] = useState<
    { [key: string]: string }[]
  >([]);

  const [selectedComponentId, setSelectedComponentId] = useState<string>();
  const [selectedBindingKey, setSelectedBindingKey] = useState<string>();
  const [selectedBindingField, setSelectedBindingField] = useState<string | undefined>(undefined);

  const selectComponentBinding = (selectedComponent: FormItem | undefined) => {
    if (!selectedComponent?.dataModelBindings) return;
    const bindings = Object.entries(selectedComponent?.dataModelBindings ?? {})
      .filter(([, value]) => Boolean(value))
      .map(([key, value]) => ({ [key]: value }));

    setSelectedComponentBindings(bindings);
  };

  const handleSave = () => {
    upsertTextResource({ language: 'nb', textId: uniqueTitleId, translation: title });
    const selectedComponent = availableComponents.find((comp) => comp.id === selectedComponentId);
    if (!selectedComponent || !selectedBindingKey) return;

    const binding = convertDataBindingToInternalFormat(selectedComponent, selectedBindingKey);

    onEdit({
      ...tableColumn,
      headerContent: uniqueTitleId,
      cellContent: { query: binding?.field },
    });
  };

  const handleDelete = () => {
    textIdMutation([{ oldId: uniqueTitleId }]);
    onDeleteColumn();
  };

  const selectComponent = (values: string[]) => {
    const componentId = values[0];
    setSelectedComponentId(componentId);

    const selectedComponent = availableComponents.find((comp) => comp.id === componentId);
    if (!selectedComponent) return;

    selectComponentBinding(selectedComponent);

    const bindingKey =
      selectedComponentBindings.length > 1
        ? Object.keys(selectedComponent.dataModelBindings)[0]
        : 'simpleBinding';
    setSelectedBindingKey(bindingKey);

    const binding = convertDataBindingToInternalFormat(selectedComponent, bindingKey);
    const updatedTableColumn = {
      ...sourceColumn,
      headerContent: selectedComponent.textResourceBindings?.title,
      cellContent: { query: binding.field },
    };

    setTitle(getValueOfTitleId(selectedComponent.textResourceBindings.title, textResources));
    setTableColumn(updatedTableColumn);
    setSelectedBindingField(binding.field);
  };

  const handleBindingChange = (value: string[]) => {
    setSelectedBindingKey(value[0]);

    const selectedComponent = availableComponents.find((comp) => comp.id === selectedComponentId);
    if (!selectedComponent) return;

    const binding = convertDataBindingToInternalFormat(selectedComponent, value[0]);
    setSelectedBindingField(binding?.field);
  };

  const subformDefaultDataModel = getDefaultDataModel(layoutSets, subformLayout);
  const availableComponents = getComponentsForSubformTable(formLayouts, subformDefaultDataModel);
  const isSaveButtonDisabled = !tableColumn.headerContent || !title?.trim();

  return (
    <StudioCard className={classes.wrapper}>
      <EditColumnElementHeader columnNumber={columnNumber} />
      <StudioCard.Content className={classes.content}>
        <EditColumnElementComponentSelect
          component={availableComponents.find((comp) => comp.id === selectedComponentId)}
          components={availableComponents}
          onSelectComponent={selectComponent}
          selectedComponentBindings={selectedComponentBindings}
          handleBindingChange={handleBindingChange}
        />
        {tableColumn.headerContent && (
          <EditColumnElementContent
            cellContent={selectedBindingField}
            title={title}
            setTitle={setTitle}
          />
        )}
        <div className={classes.buttons}>
          <StudioActionCloseButton
            variant='secondary'
            onClick={handleSave}
            title={t('general.save')}
            disabled={isSaveButtonDisabled}
          />
          <StudioDeleteButton title={t('general.delete')} onDelete={handleDelete} />
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
        <StudioParagraph size='md'>
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
  selectedComponentBindings?: Record<string, string>[];
  component?: FormItem;
  handleBindingChange?: (value: string[]) => void;
};
export const EditColumnElementComponentSelect = ({
  components,
  onSelectComponent,
  selectedComponentBindings,
  component,
  handleBindingChange,
}: EditColumnElementComponentSelectProps) => {
  const { t } = useTranslation();

  return (
    <>
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

      {selectedComponentBindings?.length > 1 && (
        <DataModelBindingsCombobox
          selectedComponentBindings={selectedComponentBindings}
          onSelectComponent={handleBindingChange}
          component={component}
        />
      )}
    </>
  );
};
