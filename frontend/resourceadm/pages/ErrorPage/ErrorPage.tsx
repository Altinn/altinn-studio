import React from "react";
import classes from "./ErrorPage.module.css";
import { Heading, Link } from "@digdir/design-system-react";
import { useTranslation } from "react-i18next";

/**
 * @component
 *    Displays an error page
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ErrorPage = (): React.ReactNode => {
  const { t } = useTranslation();
  return (
    <div className={classes.pageWrapper}>
      <Heading size="medium" level={1} spacing>
        {t("resource.error_page_text")}
      </Heading>
      <Link href="/">{t("resource.back_to_dashboard")}</Link>
    </div>
  );
};
