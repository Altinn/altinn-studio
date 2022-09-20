import React from 'react';
import { makeStyles, Tab } from '@material-ui/core';

export interface ISchemaTabProps {
  label: string;
  value: string;
  hide?: boolean;
}

const useStyles = makeStyles((theme) => ({
  root: {
    textTransform: 'none',
    fontSize: 16,
    fontWeight: 500,
    minWidth: 70,
    '&:hover': {
      color: '#40a9ff',
      opacity: 1,
    },
    '&:selected': {
      color: '#1890ff',
      fontWeight: theme.typography.fontWeightMedium,
    },
    '&:focus': {
      color: '#40a9ff',
    },
  },
}));

export const SchemaTab = ({
  label,
  value,
  hide,
  ...other
}: ISchemaTabProps) => {
  const classes = useStyles();
  return (
    <Tab
      label={label}
      classes={classes}
      id={`inspector-tab-${value}`}
      value={value}
      hidden={hide}
      {...other}
    />
  );
};
