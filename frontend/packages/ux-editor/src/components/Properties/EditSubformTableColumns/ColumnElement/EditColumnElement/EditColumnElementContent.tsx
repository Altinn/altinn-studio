import React, { useState } from 'react';

import { StudioDisplayTile, StudioProperty, StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';
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
          error={title.trim() === '' && errorMessage}
        />
      ) : (
        <StudioProperty.Button
          className={classes.componentTitleButton}
          onClick={() => setIsEditingTitle(true)}
          property={t('ux_editor.properties_panel.subform_table_columns.column_title_unedit')}
          value={title}
        />
      )}

      <StudioDisplayTile
        className={classes.componentCellContent}
        label={t('ux_editor.properties_panel.subform_table_columns.column_cell_content')}
        value={cellContent}
        showPadlock={false}
      />
    </div>
  );
};
