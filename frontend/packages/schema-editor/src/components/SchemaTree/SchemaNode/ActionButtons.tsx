import {SchemaModel} from '../../../../../schema-model';
import React, {ReactNode} from 'react';
import {TranslationKey} from '@altinn-studio/language/type';
import {Property, Reference, TrashIcon} from '@studio/icons';
import {Button} from '@digdir/design-system-react';
import type {ButtonProps} from '@digdir/design-system-react';
import {useTranslation} from 'react-i18next';
import classes from './ActionButtons.module.css';

export interface ActionButtonsProps {
  pointer: string;
  schemaModel: SchemaModel;
}

export const ActionButtons = ({ pointer, schemaModel }: ActionButtonsProps) => {
  return (
    <div className={classes.root}>
      <ActionButton
        color='danger'
        icon={<TrashIcon/>}
        titleKey='general.delete'
      />
      <ActionButton
        icon={<Property/>}
        titleKey='schema_editor.add_field'
      />
      <ActionButton
        icon={<Reference/>}
        titleKey='schema_editor.add_reference'
      />
    </div>
  )
};

export interface ActionButtonProps {
  color?: typeof ButtonProps['color'];
  icon: ReactNode;
  onClick: () => void;
  titleKey: TranslationKey;
}

const ActionButton = ({ color, icon, titleKey, onClick }: ActionButtonProps) => {
  const { t } = useTranslation();
  return (
    <Button
      color={color}
      icon={icon}
      onClick={onClick}
      size='small'
      title={t(titleKey)}
      variant='tertiary'
    />
  );
};
