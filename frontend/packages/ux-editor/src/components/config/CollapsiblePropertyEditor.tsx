import React, { useState } from 'react';
import { PlusCircleIcon, XMarkIcon } from '@studio/icons';
import { StudioButton, StudioProperty } from '@studio/components';
import classes from './CollapsiblePropertyEditor.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

//TODO: - should render property "sortOrder" with its selector inside add button "Sorteringsrekkefølge".
// - Add test for "should render property "sortOrder" with its selector inside add button "Sorteringsrekkefølge".

//TODO: - should render property "showValidations" with its selector inside add button "Vis valederingsType".
// - Add test for "should render property "showValidations" with its selector inside add button "Vis valederingsType".

//TODO: - should render property "preselectedOptionIndex" with its selector inside add button "Plassering av forhåndsvalgt verdi (indeks)".
// - Add test for "should render property "preselectedOptionIndex" with its selector inside add button "Plassering av forhåndsvalgt verdi (indeks)".

export type CollapsiblePropertyEditorProps = {
  label?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
};

export const CollapsiblePropertyEditor = ({
  label,
  children,
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
          <StudioButton
            icon={<XMarkIcon />}
            onClick={() => setIsVisible(false)}
            title={t('general.close')}
            variant='secondary'
          />
        </>
      )}
    </div>
  );
};
