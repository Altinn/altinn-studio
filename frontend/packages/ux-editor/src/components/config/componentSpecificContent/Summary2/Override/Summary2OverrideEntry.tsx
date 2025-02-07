import React from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioDeleteButton,
  StudioDivider,
  StudioProperty,
} from '@studio/components';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import classes from './Summary2OverrideEntry.module.css';
import { useTranslation } from 'react-i18next';
import { Summary2ComponentReferenceSelector } from '../Summary2ComponentReferenceSelector';
import { Summary2OverrideDisplayType } from './OverrideFields/Summary2OverrideDisplayType';
import { EmptyTextField } from './OverrideFields/EmptyTextField';
import { CompactViewSwitch } from './OverrideFields/CompactViewSwitch';
import { CheckmarkIcon } from '@studio/icons';
import { type TargetComponentProps } from '../Summary2Target/targetUtils';
import { OverrideShowComponentSwitch } from './OverrideFields/OverrideShowComponentSwitch';

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

  return (
    <StudioCard className={classes.card}>
      <StudioCard.Content className={classes.content}>
        <Summary2ComponentReferenceSelector
          label={t('ux_editor.component_properties.summary.override.choose_component')}
          value={override.componentId}
          options={componentOptions}
          onValueChange={(value) => onChange({ ...override, componentId: value })}
        ></Summary2ComponentReferenceSelector>

        <OverrideShowComponentSwitch onChange={onChange} override={override} />
        {override.hidden ? (
          <StudioAlert>
            {t('ux_editor.component_properties.summary.override.hide_empty_fields.info_message')}
          </StudioAlert>
        ) : (
          <>
            <StudioDivider className={classes.divider} />
            <CompactViewSwitch onChange={onChange} override={override} />
            <Summary2OverrideDisplayType
              onChange={onChange}
              override={override}
              componentOptions={componentOptions}
            />
            <EmptyTextField onChange={onChange} override={override} />
          </>
        )}
        <div className={classes.buttongroup}>
          <StudioButton
            icon={<CheckmarkIcon />}
            type='submit'
            title={t('general.save')}
            variant='secondary'
            color='success'
            onClick={() => setOpen(false)}
            disabled={!override.componentId}
          />
          <StudioDeleteButton onDelete={onDelete}></StudioDeleteButton>
        </div>
      </StudioCard.Content>
    </StudioCard>
  );
};
