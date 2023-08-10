import React from 'react';
import { Grid } from '@mui/material';
import Select from 'react-select';
import classNames from 'classnames';
import classes from './SchemaSelect.module.css';
import { useDatamodelsMetadataQuery } from '@altinn/schema-editor/hooks/queries';
import { convertMetadataListToOptionGroups } from '../../../../utils/metadataUtils';
import { MetadataOption } from '../../../../types/MetadataOption';
import { MetadataOptionsGroup } from '../../../../types/MetadataOptionsGroup';

export interface ISchemaSelectProps {
  disabled: boolean;
  selectedOption: MetadataOption | null;
  setSelectedOption: (option: MetadataOption) => void;
}

const formatGroupLabel = (data: MetadataOptionsGroup) => (
  <div className={classes.group}>
    <span>{data.label}</span>
    <span className={classes.groupBadge}>{data.options.length}</span>
  </div>
);

export const SchemaSelect = ({ disabled, selectedOption, setSelectedOption }: ISchemaSelectProps) => {
  const { data: metadataItems } = useDatamodelsMetadataQuery();
  const options = metadataItems && convertMetadataListToOptionGroups(metadataItems);

  const customStyles = {
    control: (base: any, state: any) => {
      const opacity = state.isDisabled ? 0.5 : 1;
      return {
        ...base,
        opacity,
        height: 36,
        minHeight: 36,
        borderRadius: 0,
        border: '2px solid #008FD6',
      };
    },
  };
  const IndicatorSeparator = () => <div></div>;
  const DropdownIndicator = () => (
    <i
      className={classNames([classes['fa.fa-nedtrekk'], 'fa fa-nedtrekk', classes.chevron])}
      aria-hidden
    />
  );
  return (
    <Grid item xs={4}>
      <Select<MetadataOption, false, MetadataOptionsGroup>
        id='schema-select-schema'
        data-testid='schema-select-schema'
        styles={customStyles}
        components={{ IndicatorSeparator, DropdownIndicator }}
        onChange={setSelectedOption}
        className={classes.select}
        options={options}
        value={selectedOption}
        isDisabled={disabled}
        formatGroupLabel={formatGroupLabel}
      />
    </Grid>
  );
};
