import Typography from '@material-ui/core/Typography';
import * as React from 'react';
import { MessageComponent } from '../components/message/MessageComponent';

export const styles = {
  inputHelper: {
    marginTop: '2.4rem',
    fontSize: '1.6rem',
    lineHeight: '3.2rem',
  },
};

export function renderPropertyLabel(textKey: string) {
  return <Typography style={styles.inputHelper}>{textKey}</Typography>;
}

export function noOptionsMessage(language: any): string {
  return language.general.no_options;
}

const messageComponentStyle = {
  display: 'block',
  width: 'fit-content',
};

export function renderValidationMessagesForComponent(
  validationMessages: any,
  id: string,
): JSX.Element[] {
  if (!validationMessages) {
    return null;
  }
  const validationMessageElements: JSX.Element[] = [];
  if (validationMessages.errors && validationMessages.errors.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(
        validationMessages.errors,
        `error_${id}`,
        'error',
      ),
    );
  }

  if (validationMessages.warnings && validationMessages.warnings.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(
        validationMessages.warnings,
        `message_${id}`,
        'message',
      ),
    );
  }
  return validationMessageElements.length > 0
    ? validationMessageElements
    : null;
}

export function renderValidationMessages(
  messages: (
    | string
    | React.ReactElement<any, string | React.JSXElementConstructor<any>>[]
  )[],
  id: string,
  messageType: any,
) {
  return (
    <MessageComponent
      messageType={messageType}
      style={messageComponentStyle}
      key={messageType}
      id={id}
    >
      <ol>
        {messages.map((message: any, idx: number) => {
          if (typeof message === 'string') {
            return (
              <li key={`validationMessage-${id}-${message}`}>
                <p role='alert'>{message}</p>
              </li>
            );
          }
          return <li key={`validationMessage-${id}-${idx}`}>{message}</li>;
        })}
      </ol>
    </MessageComponent>
  );
}
