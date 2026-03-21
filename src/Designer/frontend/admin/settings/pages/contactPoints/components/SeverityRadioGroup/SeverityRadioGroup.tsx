import React from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioRadioGroup, StudioRadio } from '@studio/components';
import { AlertSeverity } from 'app-shared/types/OrgAlertContactPoint';

type SeverityRadioGroupProps = {
  legend: string;
  name: string;
  value: AlertSeverity;
  onChange: (value: AlertSeverity) => void;
};

export const SeverityRadioGroup = ({
  legend,
  name,
  value,
  onChange,
}: SeverityRadioGroupProps): ReactElement => {
  const { t } = useTranslation();

  const options: { label: string; value: AlertSeverity }[] = [
    { label: t('org.settings.contact_points.severity_critical'), value: AlertSeverity.Critical },
    {
      label: t('org.settings.contact_points.severity_warning_critical'),
      value: AlertSeverity.WarningAndCritical,
    },
    { label: t('org.settings.contact_points.severity_all'), value: AlertSeverity.All },
    { label: t('org.settings.contact_points.severity_none'), value: AlertSeverity.None },
  ];

  return (
    <StudioRadioGroup legend={legend}>
      {options.map((option) => (
        <StudioRadio
          key={option.value}
          name={name}
          value={String(option.value)}
          label={option.label}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
        />
      ))}
    </StudioRadioGroup>
  );
};
