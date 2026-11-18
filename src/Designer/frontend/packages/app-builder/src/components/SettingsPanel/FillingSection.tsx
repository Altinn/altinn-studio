import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSwitch, StudioToggleGroup } from '@designer/components';
import type { LayoutComponent } from '../../types';
import {
  getRequiredProperty,
  getStaticBoolean,
  setRequiredValue,
} from '../../utils/componentUtils';
import { getWidth, setProperty, setWidth } from '../../utils/layoutUtils';
import type { ComponentWidth } from '../../utils/layoutUtils';
import { usePageEditing } from '../PageEditing/PageEditingContext';
import { SettingsSection } from './SettingsPanelFrame';
import classes from './SettingsPanel.module.css';

export type FillingSectionProps = {
  component: LayoutComponent;
};

/** How the question is filled in: its width, and whether it is required or read-only. */
export function FillingSection({ component }: FillingSectionProps): ReactElement {
  const { t } = useTranslation();
  const { updateComponent } = usePageEditing();
  const requiredKind = getRequiredProperty(component).kind;
  const update = (change: (current: LayoutComponent) => LayoutComponent): void =>
    updateComponent(component.id, change);

  return (
    <SettingsSection title={t('app_builder.settings.filling')}>
      <fieldset className={classes.fieldset}>
        <legend className={classes.legend}>{t('app_builder.settings.width')}</legend>
        <StudioToggleGroup
          data-size='sm'
          value={getWidth(component)}
          onChange={(width) => update((current) => setWidth(current, width as ComponentWidth))}
        >
          <StudioToggleGroup.Item value='full'>
            {t('app_builder.width.full')}
          </StudioToggleGroup.Item>
          <StudioToggleGroup.Item value='half'>
            {t('app_builder.width.half')}
          </StudioToggleGroup.Item>
        </StudioToggleGroup>
      </fieldset>
      {/* A rule is edited in the box on the canvas, so the switch would overwrite it. */}
      {(requiredKind === 'always' || requiredKind === 'never') && (
        <StudioSwitch
          label={t('app_builder.required')}
          checked={requiredKind === 'always'}
          onChange={(event) => update((current) => setRequiredValue(current, event.target.checked))}
        />
      )}
      <StudioSwitch
        label={t('app_builder.settings.read_only')}
        checked={getStaticBoolean(component.readOnly)}
        onChange={(event) =>
          update((current) => setProperty(current, 'readOnly', event.target.checked || undefined))
        }
      />
    </SettingsSection>
  );
}
