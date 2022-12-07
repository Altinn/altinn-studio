import React from 'react';
import classes from './DragHandle.module.css';

export const DragHandle = () => (
  <div className={classes.handle}>
    <span className={classes.points}>
      <span className={classes.point}></span>
      <span className={classes.point}></span>
      <span className={classes.point}></span>
      <span className={classes.point}></span>
      <span className={classes.point}></span>
      <span className={classes.point}></span>
    </span>
  </div>
);
