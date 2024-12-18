import React from 'react';
import { textResourceByLanguageAndIdSelector } from '@altinn/ux-editor/selectors/textResourceSelectors';
import type { TableColumn } from '../../types/TableColumn';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioToggleableTextfield } from '@studio/components';
import { KeyVerticalIcon } from '@studio/icons';
import { Trans, useTranslation } from 'react-i18next';

type EditColumnElementTitleProps = {
  tableColumn: TableColumn;
};

export const EditColumnElementTitle = ({ tableColumn }: EditColumnElementTitleProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: textResources } = useTextResourcesQuery(org, app);

  if (!tableColumn.headerContent) {
    return null;
  }

  const textKeyValue = textResourceByLanguageAndIdSelector(
    'nb',
    tableColumn.headerContent,
  )(textResources)?.value;

  return (
    <StudioToggleableTextfield
      inputProps={{
        icon: <KeyVerticalIcon />,
        label: t('ux_editor.properties_panel.subform_table_columns.column_title_edit'),
        value: textKeyValue,
        size: 'sm',
      }}
      viewProps={{
        children: (
          <Trans
            i18nKey={'ux_editor.properties_panel.subform_table_columns.column_title_unedit'}
            values={{ title: textKeyValue }}
          />
        ),
        variant: 'tertiary',
      }}
    />
  );
};
