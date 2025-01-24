import React, { useState } from 'react';
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
import { getAllLayoutComponents } from '../../../../../utils/formLayoutUtils';
import { useAppContext, useComponentTitle } from '@altinn/ux-editor/hooks';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Summary2ComponentReferenceSelector } from '../Summary2ComponentReferenceSelector';
import { Summary2OverrideDisplayType } from './OverrideFields/Summary2OverrideDisplayType';
import { ShowEmptyFieldSwitch } from './OverrideFields/ShowEmptyFieldsSwitch';
import { OverrideShowComponentSwitch } from './OverrideFields/ForceShowSwitch';
import { EmptyTextField } from './OverrideFields/EmptyTextField';
import { CompactViewSwitch } from './OverrideFields/CompactViewSwitch';
import { CheckmarkIcon } from '@studio/icons';

type Summary2OverrideEntryProps = {
  index: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  override: Summary2OverrideConfig;
  onChange: (override: Summary2OverrideConfig) => void;
  onDelete: () => void;
};

export const Summary2OverrideEntry = ({
  index,
  open,
  setOpen,
  override,
  onChange,
  onDelete,
}: Summary2OverrideEntryProps) => {
  const [currentComponentId, setCurrentComponentId] = useState<string | undefined>(
    override.componentId,
  );
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const getComponentTitle = useComponentTitle();

  const components = Object.values(formLayoutsData).flatMap((layout) =>
    getAllLayoutComponents(layout),
  );

  const componentOptions = components.map((e) => ({
    id: e.id,
    description: getComponentTitle(e),
  }));

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

  const handleChangeComponent = (value: string) => {
    setCurrentComponentId(value);

    if (Boolean(value) || componentOptions.some((comp) => comp.id === value))
      onChange({ ...override, componentId: value });
  };

  return (
    <StudioCard className={classes.card}>
      <StudioCard.Content className={classes.content}>
        <Summary2ComponentReferenceSelector
          label={t('ux_editor.component_properties.summary.override.choose_component')}
          value={override.componentId}
          options={componentOptions}
          onValueChange={(value) => handleChangeComponent(value)}
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
            <Summary2OverrideDisplayType onChange={onChange} override={override} />
            <ShowEmptyFieldSwitch onChange={onChange} override={override} />
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
            disabled={!currentComponentId}
          />
          <StudioDeleteButton onDelete={onDelete}></StudioDeleteButton>
        </div>
      </StudioCard.Content>
    </StudioCard>
  );
};
