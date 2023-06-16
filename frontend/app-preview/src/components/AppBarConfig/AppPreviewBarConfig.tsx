import React from 'react';
import { RepositoryType } from 'app-shared/types/global';
import { Link, useParams } from 'react-router-dom';
import { TFunction } from 'i18next';
import { editorPath } from 'app-shared/api/paths';
import { Button, ButtonVariant, Select, ToggleButtonGroup } from '@digdir/design-system-react';
import { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import { TopBarMenu } from 'app-development/layout/AppBar/appBarConfig';
import classes from '../AppPreviewSubMenu.module.css';
import { ArrowCirclepathIcon, EyeIcon, LinkIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { AppPreviewSubMenuProps } from '../AppPreviewSubMenu';
import { useLayoutSetsQuery } from '../../../../packages/ux-editor/src/hooks/queries/useLayoutSetsQuery';

export interface AppPreviewMenuItem {
  key: string;
  link: JSX.Element;
}

export interface TopBarAppPreviewMenuItem {
  key: TopBarAppPreviewMenu;
  link: string;
  repositoryTypes: RepositoryType[];
}

export enum TopBarAppPreviewMenu {
  Preview = 'general.preview',
}

const handleChangeViewSizeClick = (selectedViewSize: string, setViewSize: (value: any) => void) => {
  localStorage.setItem('viewSize', selectedViewSize);
  setViewSize(selectedViewSize);
};

export const menu: TopBarAppPreviewMenuItem[] = [
  {
    key: TopBarAppPreviewMenu.Preview,
    link: '/:org/:app',
    repositoryTypes: [RepositoryType.App],
  },
];

export const getTopBarAppPreviewMenu = (
  org: string,
  app: string,
  repositoryType: RepositoryType,
  t: TFunction
): AppPreviewMenuItem[] => {
  return menu
    .filter((menuItem) => menuItem.repositoryTypes.includes(repositoryType))
    .map((item) => {
      return {
        key: item.key,
        link: <Link to={item.link.replace(':org', org).replace(':app', app)}>{t(item.key)} </Link>,
      } as AppPreviewMenuItem;
    });
};

export const SubPreviewMenuLeftContent = ({ viewSize, setViewSize, selectedLayoutSet, handleChangeLayoutSet }: AppPreviewSubMenuProps) => {
  const { t } = useTranslation();
  const { org, app } = useParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  return (
    <div className={classes.leftSubHeaderComponents}>
      <div className={classes.viewSizeButtons}>
        <ToggleButtonGroup
          items={[
            {
              label: t('preview.view_size_desktop'),
              value: 'desktop',
            },
            {
              label: t('preview.view_size_mobile'),
              value: 'mobile',
            },
          ]}
          onChange={(value) => handleChangeViewSizeClick(value, setViewSize)}
          selectedValue={viewSize === 'desktop' ? 'desktop' : 'mobile'}
        />
      </div>
      {layoutSets &&
        <div className={classes.layoutSetSelector}>
        <Select
          onChange={(layoutSet) => handleChangeLayoutSet(layoutSet)}
          options={layoutSets.sets.map(layoutSet => ({ label: layoutSet.id, value: layoutSet.id }))}
          value={selectedLayoutSet}
        />
        </div>
      }
    </div>
  );
};

export const SubPreviewMenuRightContent = () => {
  const { t } = useTranslation();
  return (
    <div className={classes.rightSubHeaderButtons}>
      <Button data-testid='restartBtn' icon={<ArrowCirclepathIcon/>} variant={ButtonVariant.Quiet}>
        {t('preview.subheader.restart.button')}
      </Button>
      <Button data-testid='showBtn' icon={<EyeIcon/>} variant={ButtonVariant.Quiet}>
        {t('preview.subheader.showas.button')}
      </Button>
      <Button data-testid='shareBtn' icon={<LinkIcon/>} variant={ButtonVariant.Quiet}>
        {t('preview.subheader.sharelink.button')}
      </Button>
    </div>
  );
};

export const appPreviewButtonActions = (org: string, app: string, selectedLayoutInEditor: string): AltinnButtonActionItem[] => {
  const subUrl = `/ui-editor?layout=${selectedLayoutInEditor}`;
  const action = [
    {
      title: 'top_menu.preview_back_to_editing',
      path: editorPath,
      menuKey: TopBarMenu.Preview,
      buttonVariant: ButtonVariant.Outline,
      headerButtonsClasses: classes.backToEditorBtn,
      handleClick: () => (window.location.href = editorPath(org, app) + subUrl),
    },
  ];
  return action;
};
