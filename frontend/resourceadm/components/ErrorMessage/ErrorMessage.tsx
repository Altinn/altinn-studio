import React from "react";
import classes from "./errorMessage.module.css";
import { Heading, Paragraph } from "@digdir/design-system-react";

type ErrorMessageProps = {
  title: string;
  message: string;
  children?: React.ReactNode;
};

export const ErrorMessage = ({
  title,
  message,
  children,
}: ErrorMessageProps): JSX.Element => {
  return (
    <div className={classes.errorMessage}>
      <Heading size="medium" level={1}>
        {title}
      </Heading>
      <Paragraph size="small">{message}</Paragraph>
      <Paragraph size="small">
        Om problemet vedvarer, ta kontakt med oss på brukerservice +47 75 00 60
        00.
      </Paragraph>
      {children}
    </div>
  );
};
