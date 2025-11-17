import { useQueryParamState } from 'admin/hooks/useQueryParamState';
import { StudioSelect } from '@studio/components';
import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function useStatusFilter<T>(key: string): [T | undefined, (value: T | undefined) => void] {
  const [state, _setState] = useQueryParamState<{ [key: string]: T | undefined }>({
    [key]: undefined,
  });

  const setState = useCallback(
    (value: T | undefined) => _setState({ [key]: value }),
    [_setState, key],
  );

  return [state[key], setState];
}

type StatusFilterProps = {
  label: string;
  value: any;
  setValue: (value: any) => void;
  options: { label: string; value: any }[];
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
        <StudioSelect.Option key={option.value} value={JSON.stringify(option.value ?? null)}>
          {option.label}
        </StudioSelect.Option>
      ))}
    </StudioSelect>
  );
};
