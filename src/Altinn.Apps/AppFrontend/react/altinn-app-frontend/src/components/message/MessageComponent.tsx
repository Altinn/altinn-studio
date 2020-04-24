import classNames = require('classnames');
import * as React from 'react';
import { IRuntimeState } from 'src/types';
import { useSelector } from 'react-redux';
import { getMappedErrors, getUnmappedErrors } from '../../utils/validation';

export type MessageType = 'message' | 'info' | 'error' | 'success';

export interface IMessageComponentProps {
  id: string;
  messageType: MessageType;
  message?: any;
  style?: any;
  children: JSX.Element;
}

export function MessageComponent(props: IMessageComponentProps) {
  const errorRef = React.useRef(null);
  const validations = useSelector((state: IRuntimeState) => state.formValidations.validations);
  const mappedValidations = getMappedErrors(validations);
  const unmappedValidaitons = getUnmappedErrors(validations);

  React.useEffect(() => {
      if (mappedValidations?.length === 1 && unmappedValidaitons?.length === 0) {
        // if and only if there are only one mapped field and no unmpapped validaitons we set focus
        // otherwise focus is set to the ErrorReport.tsx component
        errorRef?.current?.focus();
      }
  });
  return (
    <div
      id={props.id}
      ref={errorRef}
      tabIndex={0}
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
