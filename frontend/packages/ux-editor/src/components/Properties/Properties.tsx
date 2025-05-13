import React from 'react';
import classes from './Properties.module.css';
import { PageConfigPanel } from './PageConfigPanel';
import { useAppContext } from '../../hooks';
import { GroupConfigPanel } from './GroupConfigPanel/GroupConfigPanel';
import { ComponentConfigPanel } from './ComponentConfigPanel/ComponentConfigPanel';

export const Properties = () => {
  return (
    <div className={classes.root}>
      <PropertiesSelectedConfig />
    </div>
  );
};

const PropertiesSelectedConfig = () => {
  const { selectedItem } = useAppContext();

  switch (selectedItem?.type) {
    case 'component':
      return <ComponentConfigPanel />;
    case 'page':
      return <PageConfigPanel />;
    case 'group':
      return <GroupConfigPanel />;
  }
};
