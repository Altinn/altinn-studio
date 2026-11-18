import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { StudioAlert, StudioPageSpinner } from '@designer/components';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { useOptionListsQuery } from 'app-shared/hooks/queries/useOptionListsQuery';
import { useTextResourcesQuery } from 'app-shared/hooks/queries/useTextResourcesQuery';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { ILayoutSettings } from 'app-shared/types/global';
import { EDITOR_LANGUAGE } from './constants';
import { AppBuilderProvider } from './contexts/AppBuilderContext';
import type { AppBuilderData } from './contexts/AppBuilderContext';
import { useDataModelQuery } from './hooks/useDataModelQuery';
import { useLayoutSettingsQuery } from './hooks/useLayoutSettingsQuery';
import { usePageLayoutsQuery } from './hooks/usePageLayoutsQuery';
import { usePrefillQuery } from './hooks/usePrefillQuery';
import { getPageNames, splitSummaryPage } from './utils/pageUtils';
import { getTextsById } from './utils/textUtils';
import { AppSettingsView } from './components/AppSettingsView/AppSettingsView';
import { BuilderToolbar } from './components/BuilderToolbar/BuilderToolbar';
import type { BuilderView } from './components/BuilderToolbar/BuilderToolbar';
import { CanvasFrame } from './components/CanvasFrame/CanvasFrame';
import { PageCanvas } from './components/PageCanvas/PageCanvas';
import { PageList } from './components/PageList/PageList';
import { TextsView } from './components/TextsView/TextsView';
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
  const { data: codeLists } = useOptionListsQuery(org, app);
  const dataType = getDataType(layoutSets, layoutSetName, settings);
  const { dataModel, isPending: dataModelPending } = useDataModelQuery(org, app, dataType);
  const { data: prefillConfig } = usePrefillQuery(org, app, dataModel?.modelPath);
  const [view, setView] = useState<BuilderView>('pages');
  const [selectedPageName, setSelectedPageName] = useState<string>();
  const pageNames = getPageNames(layouts ?? {}, settings);

  if (layoutsPending || settingsPending || textsPending || dataModelPending) {
    return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
  }

  const { contentPageNames, summaryPageName } = splitSummaryPage(pageNames, layouts);
  const pageName = pageNames.includes(selectedPageName) ? selectedPageName : pageNames[0];
  const data: AppBuilderData = {
    org,
    app,
    layoutSetName,
    layoutSetNames: (layoutSets ?? []).map(({ id }) => id),
    taskId: layoutSets?.find(({ id }) => id === layoutSetName)?.taskId,
    layouts,
    contentPageNames,
    summaryPageName,
    texts: getTextsById(textResources, EDITOR_LANGUAGE),
    dataModel,
    codeLists,
    prefillConfig: prefillConfig ?? undefined,
  };

  return (
    <AppBuilderProvider {...data}>
      <div className={classes.appBuilder}>
        <BuilderToolbar
          org={org}
          app={app}
          view={view}
          onViewChange={setView}
          layoutSets={layoutSets ?? []}
          layoutSetName={layoutSetName}
          onLayoutSetChange={onLayoutSetChange}
          pageName={pageName}
        />
        <main className={classes.main}>
          {view === 'pages' && (
            <div className={classes.pagesView}>
              <PageList selectedPageName={pageName} onSelectPage={setSelectedPageName} />
              <div className={classes.canvasArea}>
                {pageName ? (
                  <CanvasFrame title={t('app_builder.canvas_title')}>
                    <PageCanvas
                      key={pageName}
                      pageName={pageName}
                      onSelectPage={setSelectedPageName}
                      onPageDeleted={() => setSelectedPageName(undefined)}
                    />
                  </CanvasFrame>
                ) : (
                  <StudioAlert data-color='info'>{t('app_builder.no_pages')}</StudioAlert>
                )}
              </div>
            </div>
          )}
          {view === 'texts' && <TextsView />}
          {view === 'settings' && <AppSettingsView />}
        </main>
      </div>
    </AppBuilderProvider>
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
