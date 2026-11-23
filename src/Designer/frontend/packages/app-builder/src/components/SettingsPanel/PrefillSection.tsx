import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSelect } from '@designer/components';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useSavePrefillMutation } from '../../hooks/useSavePrefillMutation';
import type { LayoutComponent } from '../../types';
import { getBindingField } from '../../utils/bindingUtils';
import { setProperty } from '../../utils/layoutUtils';
import {
  getAvailableRegisterFields,
  getPrefill,
  registerSources,
  setPrefill,
} from '../../utils/prefillUtils';
import type { Prefill, RegisterSource } from '../../utils/prefillUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { SettingsSection } from './SettingsPanelFrame';

export type PrefillSectionProps = {
  component: LayoutComponent;
};

const noPrefill = 'none';

/**
 * Fills in the answer from a register. Prefilled answers come from a trusted source, so choosing a
 * register makes the field read-only.
 */
export function PrefillSection({ component }: PrefillSectionProps): ReactElement | null {
  const { t } = useTranslation();
  const { org, app, dataModel, prefillConfig } = useAppBuilder();
  const { updateComponent } = usePageEditing();
  const { mutate: savePrefill } = useSavePrefillMutation(org, app);
  const [fullSource, setFullSource] = useState<RegisterSource>();
  const fieldName = getBindingField(component);
  if (!dataModel || !fieldName) return null;
  const availableFields = (source: RegisterSource): string[] =>
    getAvailableRegisterFields(prefillConfig ?? undefined, source, fieldName);
  const prefill = getPrefill(prefillConfig ?? undefined, fieldName);

  const save = (newPrefill: Prefill | undefined): void => {
    savePrefill({
      modelPath: dataModel.modelPath,
      prefillConfig: setPrefill(prefillConfig ?? undefined, fieldName, newPrefill),
    });
    if (newPrefill && !prefill) {
      updateComponent(component.id, (current) => setProperty(current, 'readOnly', true));
    }
  };

  const handleSourceChange = (value: string): void => {
    setFullSource(undefined);
    if (value === noPrefill) {
      save(undefined);
      return;
    }
    const source = value as RegisterSource;
    const [firstAvailable] = availableFields(source);
    if (firstAvailable) save({ source, registerField: firstAvailable });
    else setFullSource(source);
  };

  return (
    <SettingsSection title={t('app_builder.settings.prefill')}>
      <StudioSelect
        label={t('app_builder.settings.prefill.source')}
        description={t('app_builder.settings.prefill.description')}
        value={prefill?.source ?? fullSource ?? noPrefill}
        error={
          fullSource &&
          t('app_builder.settings.prefill.source_full', {
            source: t(`app_builder.settings.prefill.source.${fullSource}`),
          })
        }
        onChange={(event) => handleSourceChange(event.target.value)}
      >
        <StudioSelect.Option value={noPrefill}>
          {t('app_builder.settings.prefill.none')}
        </StudioSelect.Option>
        {registerSources.map((source) => (
          <StudioSelect.Option key={source} value={source}>
            {t(`app_builder.settings.prefill.source.${source}`)}
          </StudioSelect.Option>
        ))}
      </StudioSelect>
      {prefill && (
        <StudioSelect
          label={t('app_builder.settings.prefill.field')}
          value={prefill.registerField}
          onChange={(event) => save({ ...prefill, registerField: event.target.value })}
        >
          {availableFields(prefill.source).map((registerField) => (
            <StudioSelect.Option key={registerField} value={registerField}>
              {t(`app_builder.settings.prefill.field.${prefill.source}.${registerField}`)}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
      )}
    </SettingsSection>
  );
}
