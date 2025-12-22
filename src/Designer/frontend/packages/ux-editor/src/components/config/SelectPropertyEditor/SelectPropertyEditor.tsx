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

  if (editMode) {
    return (
      <SelectPropertyEditMode
        setEditMode={setEditMode}
        onSave={onSave}
        onCancel={onCancel}
        className={className}
        isSaveDisabled={isSaveDisabled}
      >
        {children}
      </SelectPropertyEditMode>
    );
  }

  return (
    <StudioProperty.Button
      onClick={() => setEditMode(true)}
      property={property}
      title={title}
      value={value}
      className={className}
    />
  );
};

type SelectPropertyEditModeProps = {
  children: React.ReactNode;
  setEditMode: (editMode: boolean) => void;
  className?: string;
  onSave: () => void;
  onCancel: () => void;
  isSaveDisabled: boolean;
};

const SelectPropertyEditMode = ({
  children,
  setEditMode,
  className,
  onSave,
  onCancel,
  isSaveDisabled,
}: SelectPropertyEditModeProps) => {
  const { t } = useTranslation();

  const handleSave = () => {
    setEditMode(false);
    onSave();
  };

  const handleCancel = () => {
    setEditMode(false);
    onCancel();
  };

  return (
    <div className={cn(classes.viewMode, className)}>
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
