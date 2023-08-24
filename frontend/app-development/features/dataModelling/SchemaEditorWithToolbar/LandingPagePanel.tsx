import React from "react";
import classes from "./LandingPagePanel.module.css";
import { Button } from "@digdir/design-system-react";
import { XSDUpload } from "./TopToolbar/XSDUpload";
import { useTranslation } from "react-i18next";
import { ButtonContainer } from "app-shared/primitives";

export interface LandingPagePanelProps {
  openCreateNew: () => void;
}

export function LandingPagePanel({ openCreateNew }: LandingPagePanelProps) {
  const { t } = useTranslation();
  return (
    <div className={classes.landingDialog}>
      <h1>{t("app_data_modelling.landing_dialog_header")}</h1>
      <p>{t("app_data_modelling.landing_dialog_paragraph")}</p>
      <ButtonContainer>
        <XSDUpload
          submitButtonRenderer={(fileInputClickHandler) => (
            <Button
              color="primary"
              onClick={fileInputClickHandler}
              size="small"
            >
              {t("app_data_modelling.landing_dialog_upload")}
            </Button>
          )}
        />
        <Button color="secondary" onClick={openCreateNew} size="small">
          {t("app_data_modelling.landing_dialog_create")}
        </Button>
      </ButtonContainer>
    </div>
  );
}
