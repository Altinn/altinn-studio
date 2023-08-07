import React from 'react';
import classes from './VersionControlHeader.module.css';
import { ThreeDotsMenu } from './ThreeDotsMenu/ThreeDotsMenu';
import { VersionControlButtons } from './VersionControlButtons/';

/**
 * Displays the version control menu header
 */
export const VersionControlHeader = () => {
  return (
    <div className={classes.wrapper}>
      <div className={classes.rightWrapper}>
        <VersionControlButtons />
        <ThreeDotsMenu />
      </div>
    </div>
  );
};
