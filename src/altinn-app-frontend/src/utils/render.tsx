import * as React from "react";
import { SoftValidations } from "src/features/form/components/SoftValidations";
import { MessageComponent } from "../components/message/MessageComponent";

const messageComponentStyle = {
  display: "block",
  width: "fit-content",
};

export function renderValidationMessagesForComponent(
  validationMessages: any,
  id: string
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
        "error"
      )
    );
  }

  if (validationMessages.warnings && validationMessages.warnings.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(
        validationMessages.warnings,
        `warning_${id}`,
        "warning"
      )
    );
  }

  if (validationMessages.info && validationMessages.info.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(validationMessages.info, `info_${id}`, "info")
    );
  }

  if (validationMessages.success && validationMessages.success.length > 0) {
    validationMessageElements.push(
      renderValidationMessages(
        validationMessages.success,
        `success_${id}`,
        "success"
      )
    );
  }

  return validationMessageElements.length > 0
    ? validationMessageElements
    : null;
}

export function renderValidationMessages(
  messages: React.ReactNode[],
  id: string,
  variant: "error" | "warning" | "info" | "success"
) {
  if (variant !== "error") {
    return (
      <SoftValidations variant={variant}>
        <ol id={id}>{messages.map(validationMessagesToList)}</ol>
      </SoftValidations>
    );
  }

  return (
    <MessageComponent
      messageType="error"
      style={messageComponentStyle}
      key="error"
      id={id}
    >
      <ol>{messages.map(validationMessagesToList)}</ol>
    </MessageComponent>
  );
}

const validationMessagesToList = (message: React.ReactNode, index: number) => {
  return (
    <li
      role="alert"
      key={`validationMessage-${index}`}
    >
      {message}
    </li>
  );
};
