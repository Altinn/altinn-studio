import React, { useState } from 'react';
import { XMarkIcon } from '@studio/icons';
import { StudioButton, StudioProperty } from '@studio/components';
import classes from './CollapsiblePropertyEditor.module.css';
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

  return dataTypeSelectVisible ? (
    <div className={classes.container}>
      <div className={classes.dataTypeSelectAndButtons}>
        {children}

        <StudioButton
          icon={<XMarkIcon />}
          onClick={() => setDataTypeSelectVisible(false)}
          title={t('general.close')}
          variant='secondary'
          disabled={undefined}
        />
      </div>
    </div>
  ) : (
    <StudioProperty.Button
      onClick={() => setDataTypeSelectVisible(true)}
      property={property}
      title={title}
      value={value}
    />
  );
};
