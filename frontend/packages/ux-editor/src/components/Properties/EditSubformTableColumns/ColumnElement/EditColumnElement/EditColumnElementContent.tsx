import React, { useState } from 'react';

import { StudioCodeFragment, StudioProperty, StudioTextfield } from '@studio/components';
import { Trans, useTranslation } from 'react-i18next';
import classes from './EditColumnElementContent.module.css';

type EditColumnElementContentProps = {
  title: string;
  setTitle: (title: string) => void;
  cellContent: string;
};

export const EditColumnElementContent = ({
  title,
  setTitle,
  cellContent,
}: EditColumnElementContentProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState<boolean>(false);
  const { t } = useTranslation();

  const errorMessage = t('ux_editor.properties_panel.subform_table_columns.column_title_error');

  return (
    <div>
      {isEditingTitle ? (
        <StudioTextfield
          label={t('ux_editor.properties_panel.subform_table_columns.column_title_edit')}
          size='sm'
          value={title}
          autoFocus={true}
          onChange={(e) => setTitle(e.target.value)}
          error={!title?.trim() && errorMessage}
        />
      ) : (
        <StudioProperty.Button
          className={classes.componentTitleButton}
          onClick={() => setIsEditingTitle(true)}
          property={t('ux_editor.properties_panel.subform_table_columns.column_title_unedit')}
          value={title}
        />
      )}

      <div className={classes.componentCellContent}>
        <Trans
          i18nKey='ux_editor.properties_panel.subform_table_columns.column_cell_content'
          values={{ cellContent }}
          components={[<StudioCodeFragment key='0' />]}
        />
      </div>
    </div>
  );
};
