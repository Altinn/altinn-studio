import { StudioSelect } from '@studio/components';
import React from 'react';
import { useTranslation } from 'react-i18next';

type StatusFilterProps = {
  label: string;
  value: any;
  setValue: (value: any) => void;
  options: { label: string; labelParams?: Record<string, unknown>; value: any }[];
  disabled?: boolean;
};

export const StatusFilter = ({ label, value, setValue, options, disabled }: StatusFilterProps) => {
  const { t } = useTranslation();

  function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    setValue(JSON.parse(event.target.value) ?? undefined);
  }

  return (
    <StudioSelect
      label={t(label)}
      disabled={disabled}
      value={JSON.stringify(value ?? null)}
      onChange={handleChange}
    >
      {options.map((option) => (
        <StudioSelect.Option
          key={JSON.stringify(option.value ?? null)}
          value={JSON.stringify(option.value ?? null)}
        >
          {t(option.label, option.labelParams)}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
