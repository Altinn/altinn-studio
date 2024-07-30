import React from 'react';
import type { AltinnButtonActionItem } from 'app-shared/components/altinnHeader/types';
import classes from '../AppPreviewSubMenu.module.css';
import { ArrowCirclepathIcon, EyeIcon, LinkIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import type { AppPreviewSubMenuProps } from '../AppPreviewSubMenu';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { StudioButton, StudioNativeSelect } from '@studio/components';
import { ToggleGroup } from '@digdir/designsystemet-react';

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
      <StudioButton icon={<ArrowCirclepathIcon />} variant='tertiary' color='inverted'>
        {t('preview.subheader.restart')}
      </StudioButton>
      <StudioButton icon={<EyeIcon />} variant='tertiary' color='inverted'>
        {t('preview.subheader.showas')}
      </StudioButton>
      <StudioButton icon={<LinkIcon />} variant='tertiary' color='inverted'>
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
