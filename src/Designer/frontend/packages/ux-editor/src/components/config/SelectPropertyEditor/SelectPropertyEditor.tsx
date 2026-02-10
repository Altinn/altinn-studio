import React, { useState } from 'react';
import { StudioFormActions, StudioProperty } from '@studio/components';
import classes from './SelectPropertyEditor.module.css';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';

export type SelectPropertyEditorProps = {
  children: React.ReactNode;
  value?: string | React.ReactNode;
  property?: string;
  title?: string;
  className?: string;
  onSave: () => void;
  onCancel: () => void;
  isSaveDisabled: boolean;
};

export const SelectPropertyEditor = ({
  children,
  value,
  property,
  title,
  className,
  onSave,
  onCancel,
  isSaveDisabled,
}: SelectPropertyEditorProps) => {
  const [editMode, setEditMode] = useState(false);
  const { t } = useTranslation();

  if (!editMode) {
    return (
      <StudioProperty.Button
        onClick={() => setEditMode(true)}
        property={property}
        title={title}
        value={value}
        className={className}
      />
    );
  }

  const handleSave = () => {
    setEditMode(false);
    onSave();
  };

  const handleCancel = () => {
    setEditMode(false);
    onCancel();
  };

  return (
    <div className={cn(classes.editMode, className)}>
      <div className={classes.selectProperty}>{children}</div>
      <StudioFormActions
        className={classes.actionButtons}
        primary={{
          label: t('general.save'),
          onClick: handleSave,
          disabled: isSaveDisabled,
        }}
        secondary={{
          label: t('general.cancel'),
          onClick: handleCancel,
        }}
        isLoading={false}
        iconOnly
      />
    </div>
  );
};
