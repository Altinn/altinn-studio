import React from 'react';
import classes from './FormDesignerToolbar.module.css';
import { ToggleAddComponentPoc } from '../DesignView/DesignViewWithPageOrder/AddItem/ToggleAddComponentPoc';
import { BreadcrumbsTaskNavigation } from './Breadcrumbs';

export const FormDesignerToolbar = () => {
  return (
    <section className={classes.toolbar}>
      <BreadcrumbsTaskNavigation />
      {/* POC of new design for adding components*/}
      <ToggleAddComponentPoc />
    </section>
  );
};
