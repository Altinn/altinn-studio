import React from 'react';

import classes from 'src/components/message/ErrorPaper.module.css';

export interface IErrorPaperProps {
  message: string;
}

export function ErrorPaper(props: IErrorPaperProps) {
  return (
    <div className={classes.paperWrapper}>
      <div className={classes.paper}>
        <div className={classes.paperIcon}>
          <i className='ai ai-circle-exclamation' />
        </div>
        <div className={classes.paperMessage}>{props.message}</div>
      </div>
    </div>
  );
}
