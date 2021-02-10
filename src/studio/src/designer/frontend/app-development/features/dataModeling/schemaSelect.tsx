import * as React from 'react';
import { makeStyles } from '@material-ui/core';
import { useSelector } from 'react-redux';
import Select from 'react-select';
export interface ISchemaSelectProps {
  id: string;
  value?: any;
  onChange: (id: string, value: any) => void;
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

export const SchemaSelect = (props: ISchemaSelectProps) => {
  const classes = useStyles();
  const {id, onChange, value} = props;

  const getDataModelTypes = (applicationMetaData: any) =>
    applicationMetaData?.dataTypes?.filter((d: any) => d.appLogic).map((d: any) => ({value: d, label: d.id})) ?? [];
  
  const dataModels = useSelector((state: IServiceDevelopmentState) => getDataModelTypes(state.applicationMetadataState.applicationMetadata));
  const onValueChange = (event: any) => {
    onChange(id, event.value);
  }

  return (
    <Select
      id={`schema-select-${id}`}
      value={value ?
        dataModels.find((s: any) => s.label == value) :
        dataModels[0]}
      onChange={onValueChange}
      className={classes.select}
      fullWidth={true}
      options={dataModels}
    />
  )
}
