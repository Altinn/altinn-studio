import React from 'react';
import classes from './ResourceDeployStatus.module.css';
// import { Alert } from '@digdir/design-system-react';

interface Props {
  type: 'alert' | 'success';
  message: string;
}

export const ResourceDeployStatus = ({ type, message }: Props) => {
  return <div></div>; // <Alert></Alert>;
};
