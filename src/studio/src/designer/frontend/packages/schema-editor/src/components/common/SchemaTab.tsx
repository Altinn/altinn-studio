import React from 'react';
import { Tab } from '@mui/material';
import { makeStyles } from '@mui/styles';

export interface ISchemaTabProps {
  label: string;
  value: string;
  hide?: boolean;
}

const useStyles = makeStyles(() => ({
  root: {
    textTransform: 'none',
    minWidth: 70,
    '&:hover': {
      color: '#40a9ff',
      opacity: 1,
    },
    '&:selected': {
      color: '#1890ff',
      fontWeight: 500,
    },
    '&:focus': {
      color: '#40a9ff',
    },
  },
}));

export const SchemaTab = ({ label, value, hide, ...other }: ISchemaTabProps) => {
  const classes = useStyles();
  return (
    <Tab
      {...other}
      sx={{
        fontSize: 16,
        fontWeight: 500,
      }}
      label={label}
      classes={classes}
      id={`inspector-tab-${value}`}
      value={value}
      hidden={hide}
    />
  );
};
