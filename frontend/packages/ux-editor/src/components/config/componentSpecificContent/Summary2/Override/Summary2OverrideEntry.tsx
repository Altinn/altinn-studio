import React, { type ChangeEvent } from 'react';
import {
  StudioAlert,
  StudioCard,
  StudioDeleteButton,
  StudioDivider,
  StudioParagraph,
  StudioSwitch,
  StudioToggleableTextfield,
} from '@studio/components';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import { useTranslation } from 'react-i18next';
import { getAllLayoutComponents } from '../../../../../utils/formLayoutUtils';
import { useAppContext, useComponentTitle } from '@altinn/ux-editor/hooks';
import { useFormLayoutsQuery } from '../../../../../hooks/queries/useFormLayoutsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { Summmary2ComponentReferenceSelector } from '../Summary2ComponentReferenceSelector';
import { ComponentType } from 'app-shared/types/ComponentType';
import { Summary2OverrideDisplayType } from './Summary2OverrideDisplayType';

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

  const checkboxOrMultipleselect =
    override.componentId.includes(ComponentType.MultipleSelect) ||
    override.componentId.includes(ComponentType.Checkboxes);

  return (
    <>
      <Summmary2ComponentReferenceSelector
        label={t('ux_editor.component_properties.summary.override.choose_component')}
        value={override.componentId}
        options={componentOptions}
        onValueChange={(value) => onChangeOverride('componentId', value)}
      ></Summmary2ComponentReferenceSelector>
      <StudioCard
        style={{ marginTop: 'var(--fds-spacing-4)', marginBottom: 'var(--fds-spacing-4)' }}
      >
        <StudioCard.Content>
          <StudioSwitch
            position='right'
            size='sm'
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              onChangeOverride(
                event.target.value as keyof Summary2OverrideConfig,
                event.target.checked,
              )
            }
            checked={override.hidden ?? false}
            value={'hidden'}
          >
            {t('ux_editor.component_properties.summary.override.force_show')}
          </StudioSwitch>
          {!override.hidden ? (
            <StudioAlert>
              {t('ux_editor.component_properties.summary.override.hide_empty_fields.info_message')}
            </StudioAlert>
          ) : (
            <>
              <StudioDivider
                style={{
                  border: '1px solid',
                  borderColor: 'var(--fds-semantic-border-divider-subtle)',
                  width: '100%',
                }}
              />
              <ComponentInGroupCheckbox onChangeOverride={onChangeOverride} override={override} />
              <StudioSwitch
                position='right'
                size='sm'
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  onChangeOverride(
                    event.target.value as keyof Summary2OverrideConfig,
                    !event.target.checked,
                  )
                }
                checked={!override.hideEmptyFields}
                value={'hideEmptyFields'}
              >
                {t('ux_editor.component_properties.summary.override.hide_empty_fields')}
              </StudioSwitch>
              {override.hideEmptyFields ? (
                <StudioAlert>
                  {t(
                    'ux_editor.component_properties.summary.override.hide_empty_fields.info_message',
                  )}
                </StudioAlert>
              ) : (
                <StudioToggleableTextfield
                  inputProps={{
                    icon: '',
                    label: t('ux_editor.component_properties.summary.override.empty_field_text'),
                    size: 'sm',
                    value: override.emptyFieldText ?? '',
                    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                      onChangeOverride('emptyFieldText', event.target.value),
                  }}
                  viewProps={{
                    style: { width: '100px' },
                    icon: '',
                    iconPlacement: 'right',
                    children: (
                      <StudioParagraph size='small'>
                        <label>
                          {t('ux_editor.component_properties.summary.override.empty_field_text')}
                        </label>
                        {override.emptyFieldText}
                      </StudioParagraph>
                    ),
                    variant: 'tertiary',
                  }}
                ></StudioToggleableTextfield>
              )}
            </>
          )}
          {override.componentId && checkboxOrMultipleselect && (
            <Summary2OverrideDisplayType override={override} onChange={onChange} />
          )}
        </StudioCard.Content>
      </StudioCard>
      <StudioDeleteButton onDelete={onDelete}></StudioDeleteButton>
    </>
  );
};

type ComponentInGroupCheckboxProps = {
  onChangeOverride: (label: keyof Summary2OverrideConfig, value: string | boolean) => void;
  override: Summary2OverrideConfig;
};

const ComponentInGroupCheckbox = ({
  onChangeOverride,
  override,
}: ComponentInGroupCheckboxProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: formLayoutsData } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const handleChange = (event: ChangeEvent<HTMLInputElement>) =>
    onChangeOverride(event.target.value as keyof Summary2OverrideConfig, event.target.checked);
  const components = Object.values(formLayoutsData).flatMap((layout) =>
    getAllLayoutComponents(layout),
  );
  const component = components.find((comp) => comp.id === override.componentId);
  const isGroupComponent = component?.type === (ComponentType.Group as ComponentType);

  if (!isGroupComponent) {
    return null;
  }
  return (
    <StudioSwitch
      position='right'
      size='sm'
      onChange={handleChange}
      checked={override.isCompact ?? false}
      value='isCompact'
    >
      {t('ux_editor.component_properties.summary.override.is_compact')}
    </StudioSwitch>
  );
};
