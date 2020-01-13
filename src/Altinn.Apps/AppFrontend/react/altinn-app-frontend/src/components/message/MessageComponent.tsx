import classNames = require('classnames');
import * as React from 'react';

export type MessageType = 'message' | 'info' | 'error' | 'success';

export interface IMessageComponentProps {
  id: string;
  messageType: MessageType;
  message?: any;
  style?: any;
}

export interface IMessageComponentState { }

class MessageComponent extends React.Component<IMessageComponentProps, IMessageComponentState> {
  public render() {
    return (
      <div
        id={this.props.id}
        className={classNames(
          'field-validation-error',
          'a-message',
          {
            'a-message-info': this.props.messageType === 'info',
            'a-message-error': this.props.messageType === 'error',
            'a-message-success': this.props.messageType === 'success',
          },
        )}
        style={this.props.style}
      >
        {this.props.message ? this.props.message : this.props.children}
      </div>
    );
  }
}

export default MessageComponent;
