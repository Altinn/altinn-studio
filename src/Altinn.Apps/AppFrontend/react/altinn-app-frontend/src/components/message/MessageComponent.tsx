import * as React from 'react';
import { Grid } from '@material-ui/core';

import classNames from 'classnames';

export type MessageType = 'message' | 'info' | 'error' | 'success';

export interface IMessageComponentProps {
  id: string;
  messageType: MessageType;
  message?: any;
  style?: any;
  children: JSX.Element;
}

const iconStyles = {
  marginTop: '-2px',
  fontSize: '1.8em',
};

export function MessageComponent(props: IMessageComponentProps) {
  return (
    <div
      id={props.id}
      key={props.id}
      className={classNames('field-validation-error', 'a-message', {
        'a-message-info': props.messageType === 'info',
        'a-message-error': props.messageType === 'error',
        'a-message-success': props.messageType === 'success',
      })}
      style={props.style}
    >
      <Grid container spacing={2}>
        <Grid item xs={2}>
          <i
            className={classNames({
              'fa fa-circle-exclamation': props.messageType === 'error',
            })}
            style={iconStyles}
          />
        </Grid>
        <Grid item xs={10}>
          {props.message ? props.message : props.children}
        </Grid>
      </Grid>
    </div>
  );
}

export default MessageComponent;
