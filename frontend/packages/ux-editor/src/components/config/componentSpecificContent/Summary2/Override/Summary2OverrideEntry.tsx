import React from 'react';
import {
  StudioAlert,
  StudioButton,
  StudioCard,
  StudioDeleteButton,
  StudioDivider,
} from '@studio/components';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import classes from './Summary2OverrideEntry.module.css';
import { useTranslation } from 'react-i18next';
import { getAllLayoutComponents } from '../../../../../utils/formLayoutUtils';
import { useAppContext, useComponentTitle } from '@altinn/ux-editor/hooks';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Summmary2ComponentReferenceSelector } from '../Summary2ComponentReferenceSelector';
import { Summary2OverrideDisplayType } from './OverrideFields/Summary2OverrideDisplayType';
import { ShowEmptyFieldSwitch } from './OverrideFields/ShowEmptyFieldsSwitch';
import { ForceShowSwitch } from './OverrideFields/ForceShowSwitch';
import { EmptyTextField } from './OverrideFields/ExmptyTextField';
import { CompactViewSwitch } from './OverrideFields/CompactViewSwitch';
import { CheckmarkIcon } from '@studio/icons';

type Summary2OverrideEntryProps = {
  override: Summary2OverrideConfig;
  onChange: (override: Summary2OverrideConfig) => void;
  onDelete: () => void;
};

export const Summary2OverrideEntry = ({
  override,
  onChange,
  onDelete,
}: Summary2OverrideEntryProps) => {
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

  const onChangeOverride = (label: keyof Summary2OverrideConfig, value: string | boolean) => {
    const newOverride: Summary2OverrideConfig = { ...override, [label]: value };
    onChange(newOverride);
  };

  return (
    <StudioCard className={classes.card}>
      <StudioCard.Content className={classes.content}>
        <Summmary2ComponentReferenceSelector
          label={t('ux_editor.component_properties.summary.override.choose_component')}
          value={override.componentId}
          options={componentOptions}
          onValueChange={(value) => onChangeOverride('componentId', value)}
        ></Summmary2ComponentReferenceSelector>

        <ForceShowSwitch onChange={onChangeOverride} override={override} />
        {!override.hidden ? (
          <StudioAlert>
            {t('ux_editor.component_properties.summary.override.hide_empty_fields.info_message')}
          </StudioAlert>
        ) : (
          <>
            <StudioDivider className={classes.divider} />
            <CompactViewSwitch onChange={onChangeOverride} override={override} />
            <ShowEmptyFieldSwitch onChange={onChangeOverride} override={override} />
            <Summary2OverrideDisplayType onChange={onChange} override={override} />
            <EmptyTextField onChange={onChangeOverride} override={override} />
          </>
        )}
        <div className={classes.buttongroup}>
          <StudioButton
            icon={<CheckmarkIcon />}
            type='submit'
            title={t('general.save')}
            variant='secondary'
            color='success'
          />
          <StudioDeleteButton onDelete={onDelete}></StudioDeleteButton>
        </div>
      </StudioCard.Content>
    </StudioCard>
  );
};
