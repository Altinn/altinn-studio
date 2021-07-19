import * as React from 'react';
import { Grid, makeStyles } from '@material-ui/core';
import Select from 'react-select';
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
  },
  select: {
    minWidth: 147,
  },
});
const SchemaSelect = (props: ISchemaSelectProps) => {
  const {
    onChange, selectedOption, options,
  } = props;

  const classes = useStyles();

  return (
    <Grid item xs={4}>
      <Select
        id='schema-select-schema'
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
