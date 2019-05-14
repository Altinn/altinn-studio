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

  public getMessageClasses = () => {
    let classes = 'field-validation-error a-message';
    switch (this.props.messageType) {
      case 'info':
        classes += ' a-message-info';
        break;
      case 'error':
        classes += ' a-message-error';
        break;
      case 'success':
        classes += ' a-message-success';
        break;
      default:
        break;
    }

    return classes;
  }

  public render() {
    return (
      <div
        id={this.props.id}
        className={this.getMessageClasses()}
        style={this.props.style}
      >
        {this.props.message ? this.props.message : this.props.children}
      </div>
    );
  }
}

export default MessageComponent;
