import React from 'react';
import { RepositoryType } from 'app-shared/types/global';
import type { TFunction } from 'i18next';
import { LegacyToggleButtonGroup, LegacySelect } from '@digdir/design-system-react';
import type { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import classes from '../AppPreviewSubMenu.module.css';
import { ArrowCirclepathIcon, EyeIcon, LinkIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import type { AppPreviewSubMenuProps } from '../AppPreviewSubMenu';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { StudioButton } from '@studio/components';

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
          <LegacySelect
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
      <StudioButton icon={<ArrowCirclepathIcon />} variant='tertiary' size='small' color='inverted'>
        {t('preview.subheader.restart')}
      </StudioButton>
      <StudioButton icon={<EyeIcon />} variant='tertiary' size='small' color='inverted'>
        {t('preview.subheader.showas')}
      </StudioButton>
      <StudioButton icon={<LinkIcon />} variant='tertiary' size='small' color='inverted'>
        {t('preview.subheader.sharelink')}
      </StudioButton>
    </div>
  );
};

export const appPreviewButtonActions = (
  org: string,
  app: string,
  instanceId: string,
): AltinnButtonActionItem[] => {
  const packagesRouter = new PackagesRouter({ org, app });
  const queryParams = `?layout=${window.localStorage.getItem(instanceId)}`;

  const action: AltinnButtonActionItem[] = [
    {
      title: 'top_menu.preview_back_to_editing',
      menuKey: TopBarMenu.Preview,
      to: `${packagesRouter.getPackageNavigationUrl('editorUiEditor')}${queryParams}`,
    },
  ];
  return action;
};
