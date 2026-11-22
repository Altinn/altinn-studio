import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMutating } from '@tanstack/react-query';
import { StudioButton, StudioSelect, StudioToggleGroup } from '@designer/components';
import { PlayFillIcon } from '@designer/icons';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import classes from './BuilderToolbar.module.css';

export type BuilderView = 'pages' | 'texts' | 'settings';

const views: BuilderView[] = ['pages', 'texts', 'settings'];

export type BuilderToolbarProps = {
  org: string;
  app: string;
  view: BuilderView;
  onViewChange: (view: BuilderView) => void;
  layoutSets: LayoutSets;
  layoutSetName: string;
  onLayoutSetChange: (layoutSetName: string) => void;
  /** The page to open when the user tests the app. */
  pageName?: string;
};

/**
 * Switches between the builder's views, says whether changes are saved, and opens the app to test it.
 * The preview runs without the app's backend, so it does not need the C# model. The model is generated
 * when the user shares the changes, since the app only runs on it once it is deployed.
 */
export function BuilderToolbar({
  org,
  app,
  view,
  onViewChange,
  layoutSets,
  layoutSetName,
  onLayoutSetChange,
  pageName,
}: BuilderToolbarProps): ReactElement {
  const { t } = useTranslation();
  const isSaving = useIsMutating() > 0;
  const previewLink = `${new PackagesRouter({ org, app }).getPackageNavigationUrl('preview')}?layout=${pageName ?? ''}`;

  return (
    <div className={classes.builderToolbar} data-size='sm'>
      <StudioToggleGroup
        data-size='sm'
        value={view}
        onChange={(value) => onViewChange(value as BuilderView)}
      >
        {views.map((item) => (
          <StudioToggleGroup.Item key={item} value={item}>
            {t(`app_builder.view.${item}`)}
          </StudioToggleGroup.Item>
        ))}
      </StudioToggleGroup>
      {layoutSets.length > 1 && (
        <StudioSelect
          label={t('app_builder.layout_set')}
          data-size='sm'
          className={classes.layoutSet}
          value={layoutSetName}
          onChange={(event) => onLayoutSetChange(event.target.value)}
        >
          {layoutSets.map((layoutSet) => (
            <StudioSelect.Option key={layoutSet.id} value={layoutSet.id}>
              {layoutSet.id}
            </StudioSelect.Option>
          ))}
        </StudioSelect>
      )}
      <span className={classes.saveStatus} role='status'>
        {isSaving ? t('general.saving') : t('app_builder.saved')}
      </span>
      <StudioButton
        variant='secondary'
        data-size='sm'
        icon={<PlayFillIcon />}
        onClick={() => window.location.assign(previewLink)}
      >
        {t('app_builder.test_app')}
      </StudioButton>
    </div>
  );
}
