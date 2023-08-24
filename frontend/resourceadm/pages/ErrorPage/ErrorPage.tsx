import React from "react";
import classes from "./ErrorPage.module.css";
import { Heading, Link } from "@digdir/design-system-react";

/**
 * @component
 *    Displays an error page
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ErrorPage = (): React.ReactNode => {
  return (
    <div className={classes.pageWrapper}>
      <Heading size="medium" level={1} spacing>
        Du har nådd en ugyldig adresse
      </Heading>
      <Link href="/">Gå tilbake til dashboard</Link>
    </div>
  );
};
