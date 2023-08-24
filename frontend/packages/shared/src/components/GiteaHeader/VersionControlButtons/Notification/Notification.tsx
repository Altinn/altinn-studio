import React from "react";
import classes from "./Notification.module.css";
import { Paragraph } from "@digdir/design-system-react";

interface Props {
  numChanges: number;
}

export const Notification = ({ numChanges }: Props) => {
  return (
    <span className={classes.wrapper} aria-hidden>
      <Paragraph as="span" size="xsmall" short className={classes.number}>
        {numChanges}
      </Paragraph>
    </span>
  );
};
