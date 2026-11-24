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
  const { data: layoutSets, isPending, isError } = useLayoutSetsQuery(org, app);
  const [selectedLayoutSetName, setSelectedLayoutSetName] = useState<string>();

  if (isError) return <LoadError />;
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
  const layoutsQuery = usePageLayoutsQuery(org, app, layoutSetName);
  const settingsQuery = useLayoutSettingsQuery(org, app, layoutSetName);
  const textsQuery = useTextResourcesQuery(org, app);
  const codeListsQuery = useOptionListsQuery(org, app);
  const { data: layouts } = layoutsQuery;
  const { data: settings } = settingsQuery;
  const { data: textResources } = textsQuery;
  const { data: codeLists } = codeListsQuery;
  const dataType = getDataType(layoutSets, layoutSetName, settings);
  const dataModelQuery = useDataModelQuery(org, app, dataType);
  const { dataModel } = dataModelQuery;
  // Not every data model has a prefill file, so the query only runs when there is a data model.
  const prefillQuery = usePrefillQuery(org, app, dataModel?.modelPath);
  const { data: prefillConfig } = prefillQuery;
  const [view, setView] = useState<BuilderView>('pages');
  const [selectedPageName, setSelectedPageName] = useState<string>();
  const pageNames = getPageNames(layouts ?? {}, settings);

  // Edits replace whole files, built from what was loaded. If something could not be loaded, an edit
  // could overwrite what is there, so the builder is not shown at all.
  const queries = [layoutsQuery, settingsQuery, textsQuery, codeListsQuery, dataModelQuery];
  if (queries.some(({ isError }) => isError) || prefillQuery.isError) return <LoadError />;
  if (queries.some(({ isPending }) => isPending) || prefillQuery.isLoading) {
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

function LoadError(): ReactElement {
  const { t } = useTranslation();
  return <StudioAlert data-color='danger'>{t('app_builder.load_error')}</StudioAlert>;
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
