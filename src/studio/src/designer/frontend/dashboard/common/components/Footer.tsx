import React from 'react';
import { Resources } from './Resources';
import classes from './Footer.module.css';

export const Footer = () => {
  return (
    <div className={classes.rootGrid}>
      <Resources />
    </div>
  );
};
