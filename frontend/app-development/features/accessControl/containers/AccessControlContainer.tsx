import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { AltinnColumnLayout } from "app-shared/components/AltinnColumnLayout";
import { ApplicationMetadataActions } from "../../../sharedResources/applicationMetadata/applicationMetadataSlice";
import { Checkbox } from "@digdir/design-system-react";
import classes from "./AccessControlContainer.module.css";
import type { RootState } from "../../../store";
import { useAppSelector } from "app-development/hooks";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export interface IPartyTypesAllowed {
  bankruptcyEstate: boolean;
  organisation: boolean;
  person: boolean;
  subUnit: boolean;
}

export enum PartyTypes {
  bankruptcyEstate = "bankruptcyEstate",
  organisation = "organisation",
  person = "person",
  subUnit = "subUnit",
}

export function AccessControlContainer() {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { org, app } = useParams();

  const [partyTypesAllowed, setPartyTypesAllowed] =
    useState<IPartyTypesAllowed>({
      bankruptcyEstate: false,
      organisation: false,
      person: false,
      subUnit: false,
    });

  const applicationMetadata = useAppSelector(
    (state: RootState) => state.applicationMetadataState.applicationMetadata,
  );

  useEffect(() => {
    if (!applicationMetadata?.partyTypesAllowed) {
      return;
    }

    const usePartyTypesAllowed: IPartyTypesAllowed = {
      bankruptcyEstate:
        !!applicationMetadata.partyTypesAllowed?.bankruptcyEstate,
      organisation: !!applicationMetadata.partyTypesAllowed?.organisation,
      person: !!applicationMetadata.partyTypesAllowed?.person,
      subUnit: !!applicationMetadata.partyTypesAllowed?.subUnit,
    };

    setPartyTypesAllowed(usePartyTypesAllowed);
  }, [applicationMetadata]);

  useEffect(() => {
    dispatch(ApplicationMetadataActions.getApplicationMetadata({ org, app }));
  }, [app, dispatch, org]);

  const handlePartyTypesAllowedChange = (partyTypes: string[]) => {
    const newPartyTypesAllowed = { ...partyTypesAllowed };
    Object.keys(partyTypesAllowed).forEach((key: keyof IPartyTypesAllowed) => {
      newPartyTypesAllowed[key] = partyTypes.includes(key as string);
    });

    setPartyTypesAllowed(newPartyTypesAllowed);
    const newApplicationMetadata = JSON.parse(
      JSON.stringify(applicationMetadata || {}),
    );
    newApplicationMetadata.partyTypesAllowed = newPartyTypesAllowed;
    dispatch(
      ApplicationMetadataActions.putApplicationMetadata({
        applicationMetadata: newApplicationMetadata,
      }),
    );
  };

  const partyTypeKeys = Object.keys(PartyTypes);

  const SideMenu = (): JSX.Element => {
    return (
      <>
        <p className={classes.sidebarHeader}>
          {t("access_control.about_header")}
        </p>
        <div className={classes.sidebarSectionContainer}>
          <p className={classes.sidebarSectionHeader}>
            {t("access_control.test_initiation_header")}
          </p>
          <p className={classes.infoText}>
            {t("access_control.test_initiation")}
          </p>
        </div>
        <div className={classes.sidebarSectionContainer}>
          <p className={classes.sidebarSectionHeader}>
            {t("access_control.test_what_header")}
          </p>
          <p className={classes.infoText}>{t("access_control.test_what")}</p>
        </div>
      </>
    );
  };

  return (
    <div>
      <AltinnColumnLayout
        header={t("access_control.header")}
        sideMenuChildren={<SideMenu />}
      >
        <Checkbox.Group
          data-testid="access-control-container"
          description={t("access_control.party_type")}
          legend={t("access_control.party_type_header")}
          onChange={(values) => handlePartyTypesAllowedChange(values)}
          value={partyTypeKeys.filter(
            (key: keyof IPartyTypesAllowed) => partyTypesAllowed[key],
          )}
        >
          {partyTypeKeys.map((key: keyof IPartyTypesAllowed) => (
            <Checkbox
              value={key}
              name={key}
              disabled={false}
              checked={!!partyTypesAllowed[key]}
              id={undefined}
              key={key}
            >
              {t(`access_control.${key}`) as string}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </AltinnColumnLayout>
    </div>
  );
}
