import classes from './TimeRangeSelect.module.css';
import { StudioSelect } from '@studio/components';
import React from 'react';

export type TimeRangeSelectProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export const TimeRangeSelect = ({ label, value, onChange }: TimeRangeSelectProps) => {
  return (
    <StudioSelect
      label={label}
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      className={classes.select}
    >
      <StudioSelect.Option value='5'>5m</StudioSelect.Option>
      <StudioSelect.Option value='15'>15m</StudioSelect.Option>
      <StudioSelect.Option value='30'>30m</StudioSelect.Option>
      <StudioSelect.Option value='60'>1t</StudioSelect.Option>
      <StudioSelect.Option value='360'>6t</StudioSelect.Option>
      <StudioSelect.Option value='720'>12t</StudioSelect.Option>
      <StudioSelect.Option value='1440'>1d</StudioSelect.Option>
      <StudioSelect.Option value='4320'>3d</StudioSelect.Option>
      <StudioSelect.Option value='10080'>7d</StudioSelect.Option>
    </StudioSelect>
  );
};
