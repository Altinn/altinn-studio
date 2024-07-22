import React from 'react';
import { RepositoryType } from 'app-shared/types/global';
import type { TFunction } from 'i18next';
import type { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import classes from '../AppPreviewSubMenu.module.css';
import { ArrowCirclepathIcon, EyeIcon, LinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { AppPreviewSubMenuProps } from '../AppPreviewSubMenu';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { StudioButton, StudioNativeSelect } from '@studio/components';
import { ToggleGroup } from '@digdir/designsystemet-react';

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
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  return (
    <div className={classes.leftSubHeaderComponents}>
      <div className={classes.viewSizeButtons}>
        <ToggleGroup
          onChange={setViewSize}
          value={viewSize === 'desktop' ? 'desktop' : 'mobile'}
          size='sm'
        >
          <ToggleGroup.Item value='desktop'>{t('preview.view_size_desktop')}</ToggleGroup.Item>
          <ToggleGroup.Item value='mobile'>{t('preview.view_size_mobile')}</ToggleGroup.Item>
        </ToggleGroup>
      </div>
      {layoutSets && (
        <div className={classes.layoutSetSelector}>
          <StudioNativeSelect
            onChange={(layoutSet) => handleChangeLayoutSet(layoutSet)}
            value={selectedLayoutSet}
          >
            {layoutSets.sets.map((layoutSet) => (
              <option key={layoutSet.id} value={layoutSet.id}>
                {layoutSet.id}
              </option>
            ))}
          </StudioNativeSelect>
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

  return [
    {
      menuKey: TopBarMenu.PreviewBackToEditing,
      to: `${packagesRouter.getPackageNavigationUrl('editorUiEditor')}${queryParams}`,
    },
  ];
};
