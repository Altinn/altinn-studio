import React from 'react';
import { RepositoryType } from 'app-shared/types/global';
import { TFunction } from 'i18next';
import { Button, Select, LegacyToggleButtonGroup } from '@digdir/design-system-react';
import { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import classes from '../AppPreviewSubMenu.module.css';
import { ArrowCirclepathIcon, EyeIcon, LinkIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { AppPreviewSubMenuProps } from '../AppPreviewSubMenu';
import { useLayoutSetsQuery } from '../../../../packages/ux-editor/src/hooks/queries/useLayoutSetsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';

export interface AppPreviewMenuItem {
  key: string;
  link: JSX.Element;
}

export const menu: TopBarMenuItem[] = [
  {
    key: TopBarMenu.Preview,
    link: '/:org/:app',
    repositoryTypes: [RepositoryType.App],
  },
];

export const getTopBarAppPreviewMenu = (
  org: string,
  app: string,
  repositoryType: RepositoryType,
  t: TFunction,
): TopBarMenuItem[] => {
  return menu.filter((menuItem) => menuItem.repositoryTypes.includes(repositoryType));
};

export const SubPreviewMenuLeftContent = ({
  viewSize,
  setViewSize,
  selectedLayoutSet,
  handleChangeLayoutSet,
}: AppPreviewSubMenuProps) => {
  const { t } = useTranslation();
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  return (
    <div className={classes.leftSubHeaderComponents}>
      <div className={classes.viewSizeButtons}>
        <LegacyToggleButtonGroup
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
          onChange={setViewSize}
          selectedValue={viewSize === 'desktop' ? 'desktop' : 'mobile'}
        />
      </div>
      {layoutSets && (
        <div className={classes.layoutSetSelector}>
          <Select
            onChange={(layoutSet) => handleChangeLayoutSet(layoutSet)}
            options={layoutSets.sets.map((layoutSet) => ({
              label: layoutSet.id,
              value: layoutSet.id,
            }))}
            value={selectedLayoutSet}
          />
        </div>
      )}
    </div>
  );
};

export const SubPreviewMenuRightContent = () => {
  const { t } = useTranslation();
  return (
    <div className={classes.rightSubHeaderButtons}>
      <Button icon={<ArrowCirclepathIcon />} variant='tertiary' size='small' color='inverted'>
        {t('preview.subheader.restart')}
      </Button>
      <Button icon={<EyeIcon />} variant='tertiary' size='small' color='inverted'>
        {t('preview.subheader.showas')}
      </Button>
      <Button icon={<LinkIcon />} variant='tertiary' size='small' color='inverted'>
        {t('preview.subheader.sharelink')}
      </Button>
    </div>
  );
};

export const appPreviewButtonActions = (
  org: string,
  app: string,
  instanceId: string,
): AltinnButtonActionItem[] => {
  const packagesRouter = new PackagesRouter({ org, app });
  const subUrl = `?layout=${window.localStorage.getItem(instanceId)}`;

  const action: AltinnButtonActionItem[] = [
    {
      title: 'top_menu.preview_back_to_editing',
      menuKey: TopBarMenu.Preview,
      buttonVariant: 'secondary',
      headerButtonsClasses: classes.backToEditorBtn,
      handleClick: () => packagesRouter.navigateToPackage('editorUiEditor', subUrl),
    },
  ];
  return action;
};
