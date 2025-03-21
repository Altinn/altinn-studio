import React from 'react';
import classes from './FormDesignerToolbar.module.css';
import { ToggleAddComponentPoc } from './DesignView/AddItem/ToggleAddComponentPoc';
import { BreadcrumbsTaskNavigation } from './BreadcrumbsTaskNavigation';

export const FormDesignerToolbar = () => {
  return (
    <section className={classes.toolbar}>
      <BreadcrumbsTaskNavigation />
      {/* POC of new design for adding components*/}
      <ToggleAddComponentPoc />
    </section>
  );
};
