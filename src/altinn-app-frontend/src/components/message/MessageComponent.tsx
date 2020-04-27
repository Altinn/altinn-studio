import classNames = require('classnames');
import * as React from 'react';

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
      tabIndex={0}
      key={props.id}
      role={'alert'}
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
