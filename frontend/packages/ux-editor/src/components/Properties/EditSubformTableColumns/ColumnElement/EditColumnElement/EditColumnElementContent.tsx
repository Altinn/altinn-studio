import React from 'react';

import { StudioCodeFragment } from '@studio/components-legacy';
import { Trans, useTranslation } from 'react-i18next';
import { TextResource } from '../../../../TextResource/TextResource';
import type { TableColumn } from '../../types/TableColumn';
import classes from './EditColumnElementContent.module.css';
import { generateRandomId } from 'app-shared/utils/generateRandomId';

type EditColumnElementContentProps = {
  subformLayout: string;
  tableColumn: TableColumn;
  onChange: (updatedTableColumn: TableColumn) => void;
};

export const EditColumnElementContent = ({
  subformLayout,
  tableColumn,
  onChange,
}: EditColumnElementContentProps) => {
  const { t } = useTranslation();

  return (
    <>
      <div className={classes.textResource}>
        <TextResource
          label={t('ux_editor.properties_panel.subform_table_columns.column_title_edit')}
          textResourceId={tableColumn.headerContent}
          handleIdChange={(newTextKey) => onChange({ ...tableColumn, headerContent: newTextKey })}
          handleRemoveTextResource={() => onChange({ ...tableColumn, headerContent: '' })}
          generateIdOptions={{
            layoutId: subformLayout,
            componentId: 'tableColumn',
            textResourceKey: generateRandomId(6),
          }}
        />
      </div>

      <div className={classes.componentCellContent}>
        <Trans
          i18nKey='ux_editor.properties_panel.subform_table_columns.column_cell_content'
          values={{ cellContent: tableColumn.cellContent?.query }}
          components={[<StudioCodeFragment key='0' />]}
        />
      </div>
    </>
  );
};
