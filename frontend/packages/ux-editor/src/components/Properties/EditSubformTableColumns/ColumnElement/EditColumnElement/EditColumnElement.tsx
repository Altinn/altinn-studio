import React, { useMemo, useState, type ReactElement } from 'react';
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
  StudioTextfield,
} from '@studio/components';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { getAllLayoutComponents } from '../../../../../utils/formLayoutUtils';
import type { FormItem } from '../../../../../types/FormItem';
import { PadlockLockedFillIcon } from '@studio/icons';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { textResourceByLanguageAndIdSelector } from '../../../../../selectors/textResourceSelectors';
import { filterComponentsWithLabelAndBindings } from './filterComponentsWithLabelAndBindings';

export type ColumnElementProps = {
  sourceColumn: TableColumn;
  columnNumber: number;
  onDeleteColumn: () => void;
  onEdit: (tableColumn: TableColumn) => void;
  layoutSetName: string;
};

export const EditColumnElement = ({
  sourceColumn,
  columnNumber,
  onDeleteColumn,
  onEdit,
  layoutSetName,
}: ColumnElementProps): ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const subformLayout = layoutSetName;
  const [tableColumn, setTableColumn] = useState(sourceColumn);
  const { data: formLayouts } = useFormLayoutsQuery(org, app, subformLayout);
  const { data: textResources } = useTextResourcesQuery(org, app);

  const textKeyValue = textResourceByLanguageAndIdSelector(
    'nb',
    tableColumn.headerContent,
  )(textResources)?.value;
  const components = useMemo(() => {
    return formLayouts
      ? Object.values(formLayouts).flatMap((layout) => {
          return getAllLayoutComponents(layout);
        })
      : [];
  }, [formLayouts]);

  const componentsWithLabelAndBindings = useMemo(() => {
    return filterComponentsWithLabelAndBindings(components);
  }, [components]);

  const selectComponent = (values: string[]) => {
    const selectedComponentId = values[0];
    const selectedComponent = components.find((comp) => comp.id === selectedComponentId);

    const updatedTableColumn = {
      ...sourceColumn,
      headerContent: selectedComponent.textResourceBindings?.title,
      cellContent: { query: selectedComponent.dataModelBindings?.simpleBinding },
    };
    setTableColumn(updatedTableColumn);
  };

  return (
    <StudioCard className={classes.wrapper}>
      <EditColumnElementHeader columnNumber={columnNumber} />
      <StudioCard.Content className={classes.content}>
        <EditColumnElementComponentSelect
          components={componentsWithLabelAndBindings}
          onSelectComponent={selectComponent}
        />
        <StudioTextfield
          label={
            <>
              <PadlockLockedFillIcon />
              {t('ux_editor.modal_properties_textResourceBindings_title')}
            </>
          }
          disabled={true}
          size='sm'
          value={textKeyValue}
        />
        <div className={classes.buttons}>
          <StudioActionCloseButton
            variant='secondary'
            onClick={() => onEdit(tableColumn)}
            title={t('general.save')}
          ></StudioActionCloseButton>
          <StudioDeleteButton title={t('general.delete')} onDelete={onDeleteColumn} />
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
};
export const EditColumnElementComponentSelect = ({
  components,
  onSelectComponent,
}: EditColumnElementComponentSelectProps) => {
  const { t } = useTranslation();

  const subformComponentOptions =
    components.length > 0 ? (
      components.map((comp: FormItem) => (
        <StudioCombobox.Option key={comp.id} value={comp.id} description={comp.type}>
          {comp.id}
        </StudioCombobox.Option>
      ))
    ) : (
      <StudioCombobox.Empty key={'noComponentsWithLabel'}>
        {t('ux_editor.properties_panel.subform_table_columns.no_components_available_message')}
      </StudioCombobox.Empty>
    );

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
      {subformComponentOptions}
    </StudioCombobox>
  );
};
