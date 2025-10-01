import { StudioDivider } from '@studio/components-legacy';
import { CheckmarkIcon } from '@studio/icons';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { ComponentType } from 'app-shared/types/ComponentType';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Summary2ComponentReferenceSelector } from '../Summary2ComponentReferenceSelector';
import type { TargetComponentProps } from '../Summary2Target/targetUtils';
import { Summary2OverrideCompactSwitch } from './OverrideFields/CompactViewSwitch';
import { EmptyTextField } from './OverrideFields/EmptyTextField';
import { OverrideShowComponentSwitch } from './OverrideFields/OverrideShowComponentSwitch';
import { Summary2OverrideDisplaySelect } from './OverrideFields/Summary2OverrideDisplaySelect';
import { Summary2OverrideDisplayType } from './OverrideFields/Summary2OverrideDisplayType';
import classes from './Summary2OverrideEntry.module.css';
import {
  StudioAlert,
  StudioButton,
  StudioDeleteButton,
  StudioProperty,
  StudioCard,
} from '@studio/components';

type Summary2OverrideEntryProps = {
  index: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  componentOptions: TargetComponentProps[];
  override: Summary2OverrideConfig;
  onChange: (override: Summary2OverrideConfig) => void;
  onDelete: () => void;
};

export const Summary2OverrideEntry = ({
  index,
  open,
  setOpen,
  componentOptions,
  override,
  onChange,
  onDelete,
}: Summary2OverrideEntryProps) => {
  const { t } = useTranslation();

  if (!componentOptions) return null;

  if (!open) {
    const componentNameType = componentOptions.find(
      (comp) => comp.id === override.componentId,
    )?.description;
    return (
      <StudioProperty.Button
        className={classes.property}
        property={t('ux_editor.component_properties.summary.overrides.nth', { n: index })}
        value={componentNameType && `${componentNameType} (ID:${override.componentId})`}
        icon={false}
        onClick={() => setOpen(true)}
      />
    );
  }

  const defaultOverrideConfig = (
    componentType: ComponentType,
  ): Omit<Summary2OverrideConfig, 'componentId'> => {
    switch (componentType) {
      case ComponentType.RepeatingGroup:
        return { display: 'full' };
      case ComponentType.Subform:
        return { display: 'table' };
      case ComponentType.Checkboxes:
      case ComponentType.MultipleSelect:
        return { displayType: 'list' };
      default:
        return {};
    }
  };

  const onChangeTarget = (value: string) => {
    const componentType = componentOptions.find((comp) => comp.id === value)?.type;
    const defaults = defaultOverrideConfig(componentType);
    onChange({ componentId: value, ...defaults });
  };

  return (
    <StudioCard className={classes.card}>
      <StudioCard.Block className={classes.content}>
        <Summary2ComponentReferenceSelector
          label={t('ux_editor.component_properties.summary.override.choose_component')}
          value={override.componentId}
          options={componentOptions}
          onValueChange={(value) => onChangeTarget(value)}
        ></Summary2ComponentReferenceSelector>

        <OverrideShowComponentSwitch onChange={onChange} override={override} />
        {override.hidden ? (
          <StudioAlert>
            {t('ux_editor.component_properties.summary.override.hide_empty_fields.info_message')}
          </StudioAlert>
        ) : (
          <>
            <StudioDivider className={classes.divider} />
            <Summary2OverrideComponentSpecificConfig
              componentOptions={componentOptions}
              onChange={onChange}
              override={override}
            />
            <EmptyTextField onChange={onChange} override={override} />
          </>
        )}
        <div className={classes.buttongroup}>
          <StudioButton
            icon={<CheckmarkIcon />}
            type='submit'
            disabled={!override.componentId}
            variant='primary'
            onClick={() => setOpen(false)}
          >
            {t('ux_editor.component_properties.summary.override.save_button')}
          </StudioButton>
          <StudioDeleteButton onDelete={onDelete}>
            {t('ux_editor.component_properties.summary.override.delete_button')}
          </StudioDeleteButton>
        </div>
      </StudioCard.Block>
    </StudioCard>
  );
};

type Summary2OverrideComponentSpecificConfigProps = {
  componentOptions: TargetComponentProps[];
  onChange: (override: Summary2OverrideConfig) => void;
  override: Summary2OverrideConfig;
};

const Summary2OverrideComponentSpecificConfig = ({
  onChange,
  override,
  componentOptions,
}: Summary2OverrideComponentSpecificConfigProps) => {
  const selectedComponent = componentOptions?.find((comp) => comp.id === override.componentId);

  if (!selectedComponent) {
    return null;
  }

  switch (selectedComponent.type) {
    case ComponentType.RepeatingGroup:
    case ComponentType.Subform:
      return <Summary2OverrideDisplaySelect onChange={onChange} override={override} />;
    case ComponentType.Checkboxes:
    case ComponentType.MultipleSelect:
      return <Summary2OverrideDisplayType onChange={onChange} override={override} />;
    case ComponentType.Group:
      return <Summary2OverrideCompactSwitch onChange={onChange} override={override} />;
    default:
      return null;
  }
};
