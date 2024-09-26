import { Divider } from '@digdir/designsystemet-react';
import { StudioButton, StudioCard, StudioHeading, StudioParagraph } from '@studio/components';
import type { Summary2OverrideConfig } from 'app-shared/types/ComponentSpecificConfig';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Summary2OverrideEntry } from './Summary2OverrideEntry';

type Summary2OverrideProps = {
  overrides: Summary2OverrideConfig[];
  onChange: (overrides: Summary2OverrideConfig[]) => void;
};

export const Summary2Override = ({ overrides, onChange }: Summary2OverrideProps) => {
  const { t } = useTranslation();

  const addOverride = (): void => {
    const updatedOverrides = [...(overrides || [])];
    updatedOverrides.push({ componentId: '' });
    onChange(updatedOverrides);
  };

  const onChangeOverride =
    (index: number): ((override: any) => void) =>
    (override: any) => {
      const updatedOverrides = [...overrides];
      updatedOverrides[index] = override;
      onChange(updatedOverrides);
    };

  const onDeleteOverride =
    (index: number): (() => void) =>
    () => {
      const updatedOverrides = [...overrides];
      updatedOverrides.splice(index, 1);
      onChange(updatedOverrides);
    };

  return (
    <StudioCard>
      <StudioCard.Header>
        <StudioHeading size='2xs'>{t('ux_editor.component_properties.overrides')}</StudioHeading>
      </StudioCard.Header>
      <StudioParagraph size='sm'>
        {t('ux_editor.component_properties.overrides_description')}
      </StudioParagraph>
      <StudioCard.Content>
        {overrides &&
          overrides.map((override, index) => (
            <StudioCard key={index}>
              <StudioCard.Content>
                <Divider></Divider>
                <Summary2OverrideEntry
                  override={override}
                  onChange={onChangeOverride(index)}
                  onDelete={onDeleteOverride(index)}
                ></Summary2OverrideEntry>
              </StudioCard.Content>
            </StudioCard>
          ))}
        <StudioButton size='sm' variant='primary' onClick={addOverride}>
          {t('ux_editor.component_properties.summary.add_override')}
        </StudioButton>
      </StudioCard.Content>
    </StudioCard>
  );
};
