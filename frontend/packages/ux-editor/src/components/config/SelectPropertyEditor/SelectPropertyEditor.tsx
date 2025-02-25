import React, { useState } from 'react';
import { XMarkIcon } from '@studio/icons';
import { StudioButton, StudioProperty } from '@studio/components';
import classes from './SelectPropertyEditor.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

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

  return (
    <div className={cn(dataTypeSelectVisible ? classes.container : classes.viewMode)}>
      {dataTypeSelectVisible ? (
        <div className={classes.editSelectProperty}>
          <div className={classes.selectProperty}>{children}</div>
          <StudioButton
            icon={<XMarkIcon />}
            onClick={() => setDataTypeSelectVisible(false)}
            title={t('general.close')}
            variant='secondary'
          />
        </div>
      ) : (
        <StudioProperty.Button
          onClick={() => setDataTypeSelectVisible(true)}
          property={property}
          title={title}
          value={value}
          className={classes.viewSelectProperty}
        />
      )}
    </div>
  );
};
