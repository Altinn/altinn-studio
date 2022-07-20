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

export function MessageComponent({
  id,
  style,
  messageType,
  message,
  children,
}: IMessageComponentProps) {
  return (
    <div
      data-testid={`message-component-${id}`}
      id={id}
      key={id}
      className={classNames('field-validation-error', 'a-message', {
        'a-message-info': messageType === 'info',
        'a-message-error': messageType === 'error',
        'a-message-success': messageType === 'success',
      })}
      style={style}
    >
      <Grid
        container
        spacing={2}
      >
        <Grid
          item
          xs={2}
        >
          <i
            className={classNames({
              'fa fa-circle-exclamation': messageType === 'error',
            })}
            style={iconStyles}
          />
        </Grid>
        <Grid
          item
          xs={10}
        >
          {message ? message : children}
        </Grid>
      </Grid>
    </div>
  );
}

export default MessageComponent;
