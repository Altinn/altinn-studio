import React from "react";
import { Route, Routes } from "react-router-dom";
import { routes } from "../config/routes";
import { AltinnHeader } from "app-shared/components/altinnHeader/AltinnHeader";
import { getTopBarMenu } from "./AppBar/appBarConfig";
import { getRepositoryType } from "app-shared/utils/repository";
import { useUserQuery } from "app-development/hooks/queries";
import { useAppSelector } from "app-development/hooks";
import { previewPath, publishPath } from "app-shared/api/paths";
import { TopBarMenu } from "./AppBar/appBarConfig";
import { useTranslation } from "react-i18next";
import { AltinnButtonActionItem } from "app-shared/components/altinnHeader/types";
import { GiteaHeader } from "app-shared/components/GiteaHeader";

type SubMenuContentProps = {
  org: string;
  app: string;
};

export const subMenuContent = ({ org, app }: SubMenuContentProps) => {
  return <GiteaHeader org={org} app={app} hasCloneModal />;
};

export const buttonActions = (
  org: string,
  app: string
): AltinnButtonActionItem[] => {
  const actions: AltinnButtonActionItem[] = [
    {
      title: "top_menu.preview",
      path: previewPath,
      menuKey: TopBarMenu.Preview,
      buttonVariant: "outline",
      buttonColor: "inverted",
      headerButtonsClasses: undefined,
      handleClick: () => (window.location.href = previewPath(org, app)),
      inBeta: true,
    },
    {
      title: "top_menu.deploy",
      path: publishPath,
      menuKey: TopBarMenu.Deploy,
      buttonVariant: "outline",
      headerButtonsClasses: undefined,
      handleClick: () => (window.location.href = publishPath(org, app)),
    },
  ];
  return actions;
};

type PageHeaderProps = {
  showSubMenu: boolean;
  org: string;
  app: string;
};

export const PageHeader = ({ showSubMenu, org, app }: PageHeaderProps) => {
  const repoType = getRepositoryType(org, app);
  const { t } = useTranslation();
  const { data: user } = useUserQuery();
  const repository = useAppSelector(
    (state) => state.serviceInformation.repositoryInfo
  );
  const menu = getTopBarMenu(org, app, repoType, t);

  return (
    <Routes>
      {routes.map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <AltinnHeader
              menu={menu}
              showSubMenu={showSubMenu}
              subMenuContent={subMenuContent({ org, app })}
              activeMenuSelection={route.activeSubHeaderSelection}
              org={org}
              app={app}
              user={user}
              repository={{ ...repository }}
              buttonActions={buttonActions(org, app)}
            />
          }
        />
      ))}
    </Routes>
  );
};
