import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import classes from './SwitchInput.module.css';
import { StudioSwitch, StudioCard, StudioParagraph, StudioTag } from '@studio/components';
import { useTranslation } from 'react-i18next';

export type SwitchInputProps = {
  switchAriaLabel: string;
  cardHeading: string;
  description: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
};

export function SwitchInput({
  switchAriaLabel,
  cardHeading,
  description,
  checked,
  onChange,
  required = false,
}: SwitchInputProps): ReactElement {
  const { t } = useTranslation();

  const tagColor: string = required ? 'warning' : 'info';
  const tagText: string = required ? t('general.required') : t('general.optional');

  return (
    <StudioCard data-color='neutral'>
      <div className={classes.topContentWrapper}>
        <div className={classes.headingWrapper}>
          <StudioParagraph>{cardHeading}</StudioParagraph>
          <StudioTag data-color={tagColor}>{tagText}</StudioTag>
        </div>
        <StudioSwitch checked={checked} onChange={onChange} aria-label={switchAriaLabel} />
      </div>
      <StudioParagraph>{description}</StudioParagraph>
    </StudioCard>
  );
}
