import * as React from 'react';

import classNames = require('classnames');

export type MessageType = 'message' | 'info' | 'error' | 'success';

export interface IMessageComponentProps {
  id: string;
  messageType: MessageType;
  message?: any;
  style?: any;
  children: JSX.Element;
}

export function MessageComponent(props: IMessageComponentProps) {

  return (
    <div
      id={props.id}
      key={props.id}
      className={classNames(
        'field-validation-error',
        'a-message',
        {
          'a-message-info': props.messageType === 'info',
          'a-message-error': props.messageType === 'error',
          'a-message-success': props.messageType === 'success',
        },
      )}
      style={props.style}
    >
      {props.message ? props.message : props.children}
    </div>
  );
}

export default MessageComponent;
