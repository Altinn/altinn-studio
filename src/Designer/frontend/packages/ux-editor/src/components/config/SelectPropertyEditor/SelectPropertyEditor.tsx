import React, { useState } from 'react';
import { XMarkIcon } from 'libs/studio-icons/src';
import { StudioButton } from 'libs/studio-components-legacy/src';
import { StudioProperty } from 'libs/studio-components/src';
import classes from './SelectPropertyEditor.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

export type SelectPropertyEditorProps = {
  children?: React.ReactNode;
  value?: string | React.ReactNode;
  property?: string;
  title?: string;
  className?: string;
};

export const SelectPropertyEditor = ({
  children,
  value,
  property,
  title,
  className,
}: SelectPropertyEditorProps) => {
  const { t } = useTranslation();
  const [dataTypeSelectVisible, setDataTypeSelectVisible] = useState(false);

  return (
    <div className={cn(dataTypeSelectVisible ? classes.container : classes.viewMode)}>
      {dataTypeSelectVisible ? (
        <div className={cn(classes.editSelectProperty, className)}>
          <div className={classes.selectProperty}>{children}</div>
          <StudioButton
            icon={<XMarkIcon />}
            onClick={() => setDataTypeSelectVisible(false)}
            title={t('general.close')}
            variant='secondary'
            className={classes.closeButton}
          />
        </div>
      ) : (
        <StudioProperty.Button
          onClick={() => setDataTypeSelectVisible(true)}
          property={property}
          title={title}
          value={value}
          className={cn(classes.viewSelectProperty, className)}
        />
      )}
    </div>
  );
};
