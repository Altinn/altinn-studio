import * as React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import Select from 'react-select';
import classNames from 'classnames';
import { IMetadataOption } from '../functions/types';

interface ISchemaSelectProps {
  selectedOption: IMetadataOption | null;
  onChange: (optionWithMetadata: { value: any, label: string }) => void;
  options: IMetadataOption[];
}

const useStyles = makeStyles({
  root: {
    margin: 12,
    width: '100%',
    maxHeight: 36,
  },
  select: {
    minWidth: 147,
  },
  chevron: {
    margin: 12,
    color: '#006BD8',
    '&.fa.fa-nedtrekk': {
      fontSize: 16,
      fontWeight: 600,
    },
  },
});
const SchemaSelect = (props: ISchemaSelectProps) => {
  const {
    onChange, selectedOption, options,
  } = props;

  const classes = useStyles();
  const customStyles = {
    control: (base: any) => ({
      ...base,
      height: 36,
      minHeight: 36,
      borderRadius: 0,
      border: '1px solid #006BD8',
    }),
  };
  const IndicatorSeparator = () => <></>;
  const DropdownIndicator = () => <i className={classNames(['fa fa-nedtrekk', classes.chevron])} aria-hidden />;
  return (
    <Grid item xs={4}>
      <Select
        id='schema-select-schema'
        styles={customStyles}
        components={{ IndicatorSeparator, DropdownIndicator }}
        onChange={onChange}
        className={classes.select}
        fullWidth={true}
        options={options}
        value={selectedOption}
      />
    </Grid>
  );
};
export default SchemaSelect;
