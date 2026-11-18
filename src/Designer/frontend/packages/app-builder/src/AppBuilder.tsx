import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioPageSpinner } from '@studio/components';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ILayoutSettings } from 'app-shared/types/global';
import { EDITOR_LANGUAGE } from './constants';
import { useDataModelQuery } from './hooks/useDataModelQuery';
import { useLayoutSettingsQuery } from './hooks/useLayoutSettingsQuery';
import { usePageLayoutsQuery } from './hooks/usePageLayoutsQuery';
import { getPageNames } from './utils/pageUtils';
import { getTextsById } from './utils/textUtils';
import { CanvasFrame } from './components/CanvasFrame/CanvasFrame';
import { PageCanvas } from './components/PageCanvas/PageCanvas';
import { TopBar } from './components/TopBar/TopBar';
import classes from './AppBuilder.module.css';

export type AppBuilderProps = {
  org: string;
  app: string;
};

export function AppBuilder({ org, app }: AppBuilderProps): ReactElement {
  const { t } = useTranslation();
  const { data: layoutSets, isPending } = useLayoutSetsQuery(org, app);
  const [selectedLayoutSetName, setSelectedLayoutSetName] = useState<string>();

  if (isPending) return <StudioPageSpinner spinnerTitle={t('general.loading')} />;

  const layoutSetName = selectedLayoutSetName ?? getDefaultLayoutSetName(layoutSets);
  if (!layoutSetName)
    return <StudioAlert data-color='info'>{t('app_builder.no_pages')}</StudioAlert>;

  return (
    <LayoutSetBuilder
      key={layoutSetName}
      org={org}
      app={app}
      layoutSets={layoutSets}
      layoutSetName={layoutSetName}
      onLayoutSetChange={setSelectedLayoutSetName}
    />
  );
}

// Subforms are edited from the form that contains them.
function getDefaultLayoutSetName(layoutSets: LayoutSets | null): string | undefined {
  return layoutSets?.find((layoutSet) => layoutSet.type !== 'subform')?.id;
}

type LayoutSetBuilderProps = AppBuilderProps & {
  layoutSets: LayoutSets | null;
  layoutSetName: string;
  onLayoutSetChange: (layoutSetName: string) => void;
};

function LayoutSetBuilder({
  org,
  app,
  layoutSets,
  layoutSetName,
  onLayoutSetChange,
}: LayoutSetBuilderProps): ReactElement {
  const { t } = useTranslation();
  const { data: layouts, isPending: layoutsPending } = usePageLayoutsQuery(org, app, layoutSetName);
  const { data: settings, isPending: settingsPending } = useLayoutSettingsQuery(
    org,
    app,
    layoutSetName,
  );
  const { data: textResources, isPending: textsPending } = useTextResourcesQuery(org, app);
  const dataType = getDataType(layoutSets, layoutSetName, settings);
  const { dataModel, isPending: dataModelPending } = useDataModelQuery(org, app, dataType);
  const [selectedPageName, setSelectedPageName] = useState<string>();

  if (layoutsPending || settingsPending || textsPending || dataModelPending) {
    return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
  }

  const pageNames = getPageNames(layouts ?? {}, settings);
  const pageName = selectedPageName ?? pageNames[0];

  return (
    <div className={classes.appBuilder}>
      <TopBar
        org={org}
        app={app}
        layoutSets={layoutSets ?? []}
        layoutSetName={layoutSetName}
        onLayoutSetChange={onLayoutSetChange}
        pageNames={pageNames}
        pageName={pageName}
        onPageChange={setSelectedPageName}
      />
      <main className={classes.canvasArea}>
        {pageName ? (
          <CanvasFrame title={t('app_builder.canvas_title')}>
            <PageCanvas
              key={pageName}
              org={org}
              app={app}
              layoutSetName={layoutSetName}
              layoutSetNames={(layoutSets ?? []).map(({ id }) => id)}
              pageName={pageName}
              layouts={layouts}
              texts={getTextsById(textResources, EDITOR_LANGUAGE)}
              dataModel={dataModel}
            />
          </CanvasFrame>
        ) : (
          <StudioAlert data-color='info'>{t('app_builder.no_pages')}</StudioAlert>
        )}
      </main>
    </div>
  );
}

// Apps on app frontend v9 name the data type in the layout settings; older apps in the layout set.
function getDataType(
  layoutSets: LayoutSets | null,
  layoutSetName: string,
  settings: ILayoutSettings | undefined,
): string | undefined {
  const layoutSet = layoutSets?.find(({ id }) => id === layoutSetName);
  const defaultDataType = (settings as { defaultDataType?: string } | undefined)?.defaultDataType;
  return layoutSet?.dataType ?? defaultDataType;
}
