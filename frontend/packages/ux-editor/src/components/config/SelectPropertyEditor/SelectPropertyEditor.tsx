import React, { useState } from 'react';
import { XMarkIcon } from '@studio/icons';
import { StudioButton, StudioProperty } from '@studio/components-legacy';
import classes from './SelectPropertyEditor.module.css';
import { useTranslation } from 'react-i18next';

export type SelectPropertyEditorProps = {
  children?: React.ReactNode;
  value?: string | React.ReactNode;
  property?: string;
  title?: string;
};

export const SelectPropertyEditor = ({
  children,
  value,
  property,
  title,
}: SelectPropertyEditorProps) => {
  const { t } = useTranslation();
  const [dataTypeSelectVisible, setDataTypeSelectVisible] = useState(false);

  if (dataTypeSelectVisible) {
    return (
      <div className={classes.editSelectProperty}>
        <div className={classes.selectProperty}>{children}</div>
        <StudioButton
          icon={<XMarkIcon />}
          onClick={() => setDataTypeSelectVisible(false)}
          title={t('general.close')}
          variant='secondary'
          className={classes.closeButton}
        />
      </div>
    );
  }

  return (
    <div className={classes.viewMode}>
      <StudioProperty.Button
        onClick={() => setDataTypeSelectVisible(true)}
        property={property}
        title={title}
        value={value}
        className={classes.viewSelectProperty}
      />
    </div>
  );
};
