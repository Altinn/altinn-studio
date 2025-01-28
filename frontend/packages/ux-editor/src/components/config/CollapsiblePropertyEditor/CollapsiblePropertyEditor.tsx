import React, { useState } from 'react';
import { PlusCircleIcon, XMarkIcon } from '@studio/icons';
import { StudioButton, StudioProperty } from '@studio/components';
import classes from './CollapsiblePropertyEditor.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

export type CollapsiblePropertyEditorProps = {
  label?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  disabledCloseButton?: boolean;
};

export const CollapsiblePropertyEditor = ({
  label,
  children,
  disabledCloseButton = false,
  icon = <PlusCircleIcon />,
}: CollapsiblePropertyEditorProps) => {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className={cn(isVisible ? classes.collapsibleContainer : classes.collapsibleContainerClosed)}
    >
      {!isVisible ? (
        <StudioProperty.Button
          className={classes.button}
          icon={icon}
          onClick={() => setIsVisible(true)}
          property={label}
        />
      ) : (
        <>
          <div className={classes.editorContent}>{children}</div>
          {!disabledCloseButton && (
            <StudioButton
              icon={<XMarkIcon />}
              onClick={() => setIsVisible(false)}
              title={t('general.close')}
              variant='secondary'
            />
          )}
        </>
      )}
    </div>
  );
};
