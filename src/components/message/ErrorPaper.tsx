import React from 'react';

import classes from 'src/components/message/ErrorPaper.module.css';
import { AsciiUnitSeparator } from 'src/utils/attachment';

export interface IErrorPaperProps {
  message: string;
}

export function ErrorPaper(props: IErrorPaperProps) {
  const errorMessage = (message: string) =>
    message.includes(AsciiUnitSeparator) ? message.substring(message.indexOf(AsciiUnitSeparator) + 1) : message;
  return (
    <div className={classes.paperWrapper}>
      <div className={classes.paper}>
        <div className={classes.paperIcon}>
          <i className='ai ai-circle-exclamation' />
        </div>
        <div className={classes.paperMessage}>{errorMessage(props.message)}</div>
      </div>
    </div>
  );
}
