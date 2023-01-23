import React from 'react';
import { Resources } from '../../components/Resources';
import classes from './Footer.module.css';

export const Footer = () => {
  return (
    <footer className={classes.footer}>
      <div className={classes.footerContent}>
        <Resources />
      </div>
    </footer>
  );
};
