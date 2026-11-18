import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMutating } from '@tanstack/react-query';
import { StudioButton, StudioSelect, StudioToggleGroup } from '@designer/components';
import { PlayFillIcon } from '@designer/icons';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { useAppBuilder } from '../../contexts/AppBuilderContext';
import { useGenerateModelMutation } from '../../hooks/useGenerateModelMutation';
import { useIsModelOutOfDateQuery } from '../../hooks/useIsModelOutOfDateQuery';
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
 * The app runs on the C# model, which the builder does not generate on every change, so testing
 * generates it first when it is out of date, and the toolbar says when it is.
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
  const { dataModel } = useAppBuilder();
  const { data: isModelOutOfDate } = useIsModelOutOfDateQuery(org, app, dataModel?.modelPath);
  const { mutateAsync: generateModel, isPending: isGenerating } = useGenerateModelMutation(
    org,
    app,
  );
  const previewLink = `${new PackagesRouter({ org, app }).getPackageNavigationUrl('preview')}?layout=${pageName ?? ''}`;

  const testApp = async (): Promise<void> => {
    try {
      if (isModelOutOfDate && dataModel) await generateModel(dataModel);
      window.location.assign(previewLink);
    } catch {
      // The error is shown by the global error handler, and the app is not opened with a broken model.
    }
  };

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
      {isModelOutOfDate && dataModel && !isGenerating && (
        <span className={classes.modelStatus}>
          {t('app_builder.model.out_of_date')}
          <StudioButton
            variant='tertiary'
            data-size='sm'
            onClick={() => void generateModel(dataModel)}
          >
            {t('app_builder.model.generate')}
          </StudioButton>
        </span>
      )}
      <StudioButton
        variant='secondary'
        data-size='sm'
        icon={<PlayFillIcon />}
        loading={isGenerating}
        onClick={() => void testApp()}
      >
        {isGenerating ? t('app_builder.model.generating') : t('app_builder.test_app')}
      </StudioButton>
    </div>
  );
}
