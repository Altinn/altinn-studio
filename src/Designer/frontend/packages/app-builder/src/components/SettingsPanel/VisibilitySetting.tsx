import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioParagraph, StudioToggleGroup } from '@designer/components';
import { useRuleFields } from '../../hooks/useRuleFields';
import { createDefaultRule, readHiddenProperty, toHiddenExpression } from '../../utils/ruleUtils';
import { RuleBox } from '../RuleBox/RuleBox';
import { SettingsSection } from './SettingsPanelFrame';
import classes from './SettingsPanel.module.css';

export type VisibilityTarget = 'field' | 'group' | 'text' | 'page';

export type VisibilitySettingProps = {
  target: VisibilityTarget;
  /** The `hidden` property of the component or page. */
  hidden: unknown;
  ownerId?: string;
  onChange: (hidden: unknown) => void;
};

type Visibility = 'always' | 'conditional';

/** Chooses whether the component or page is always shown, or only when a rule is true. */
export function VisibilitySetting({
  target,
  hidden,
  ownerId,
  onChange,
}: VisibilitySettingProps): ReactElement {
  const { t } = useTranslation();
  const property = readHiddenProperty(hidden);
  const defaultRule = createDefaultRule(useRuleFields(ownerId));

  const handleVisibilityChange = (visibility: Visibility): void => {
    if (visibility === 'always') onChange(undefined);
    else if (defaultRule) onChange(toHiddenExpression(defaultRule));
  };

  return (
    <SettingsSection title={t(`app_builder.settings.visibility.${target}`)}>
      {property.kind === 'advanced' || property.kind === 'never' ? (
        <StudioParagraph data-size='sm' className={classes.summary}>
          {t(`app_builder.settings.visibility.${property.kind}`)}
        </StudioParagraph>
      ) : (
        <>
          {defaultRule && (
            <StudioToggleGroup
              data-size='sm'
              value={property.kind === 'rule' ? 'conditional' : 'always'}
              onChange={(value) => handleVisibilityChange(value as Visibility)}
            >
              <StudioToggleGroup.Item value='always'>
                {t('app_builder.settings.visibility.always')}
              </StudioToggleGroup.Item>
              <StudioToggleGroup.Item value='conditional'>
                {t('app_builder.settings.visibility.conditional')}
              </StudioToggleGroup.Item>
            </StudioToggleGroup>
          )}
          {property.kind === 'rule' ? (
            <RuleBox
              kind='show'
              rule={property.rule}
              ownerId={ownerId}
              onChange={(rule) => onChange(toHiddenExpression(rule))}
              onDelete={() => onChange(undefined)}
            />
          ) : (
            <StudioParagraph data-size='sm' className={classes.summary}>
              {t('app_builder.settings.visibility.shown_to_all')}
            </StudioParagraph>
          )}
        </>
      )}
    </SettingsSection>
  );
}
