import React from 'react';
import { StudioDeleteButton, StudioTextfield } from '@studio/components';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@digdir/designsystemet-react';
import { getAllLayoutComponents } from '../../../../../utils/formLayoutUtils';
import { useAppContext, useComponentTypeName } from '../../../../../hooks';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Summmary2ComponentReferenceSelector } from '../Summary2ComponentReferenceSelector';

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
  const componentTypeName = useComponentTypeName();

  const components = Object.values(formLayoutsData).flatMap((layout) =>
    getAllLayoutComponents(layout),
  );
  const componentOptions = components.map((e) => ({
    id: e.id,
    description: componentTypeName(e.type),
  }));

  const onChangeOverride = (label: keyof Summary2OverrideConfig, value: string | boolean) => {
    const newOverride: Summary2OverrideConfig = { ...override, [label]: value };
    onChange(newOverride);
  };

  return (
    <>
      <Summmary2ComponentReferenceSelector
        label={t('ux_editor.component_properties.summary.override.component_id')}
        value={override.componentId ?? ''}
        options={componentOptions}
        onValueChange={(value) => onChangeOverride('componentId', value)}
      ></Summmary2ComponentReferenceSelector>
      <Checkbox
        size='sm'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeOverride(event.target.value as keyof Summary2OverrideConfig, event.target.checked)
        }
        checked={override.hidden ?? false}
        value={'hidden'}
      >
        {t('ux_editor.component_properties.summary.override.hidden')}
      </Checkbox>
      <Checkbox
        size='sm'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeOverride(event.target.value as keyof Summary2OverrideConfig, event.target.checked)
        }
        checked={override.forceShow ?? false}
        value={'forceShow'}
      >
        {t('ux_editor.component_properties.summary.override.force_show')}
      </Checkbox>
      <Checkbox
        size='sm'
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeOverride(event.target.value as keyof Summary2OverrideConfig, event.target.checked)
        }
        checked={override.hideEmptyFields ?? false}
        value={'hideEmptyFields'}
      >
        {t('ux_editor.component_properties.summary.override.hide_empty_fields')}
      </Checkbox>
      <StudioTextfield
        label={t('ux_editor.component_properties.summary.override.empty_field_text')}
        size='sm'
        value={override.emptyFieldText ?? ''}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
          onChangeOverride('emptyFieldText', event.target.value)
        }
      ></StudioTextfield>
      <StudioDeleteButton onDelete={onDelete}></StudioDeleteButton>
    </>
  );
};
