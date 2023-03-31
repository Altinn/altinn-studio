import { all, call, put, race, select, take } from 'redux-saga/effects';
import type { SagaIterator } from 'redux-saga';

import { DataListsActions } from 'src/features/dataLists/dataListsSlice';
import { FormDataActions } from 'src/features/formData/formDataSlice';
import { InstanceDataActions } from 'src/features/instanceData/instanceDataSlice';
import { IsLoadingActions } from 'src/features/isLoading/isLoadingSlice';
import { LanguageActions } from 'src/features/language/languageSlice';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { OptionsActions } from 'src/features/options/optionsSlice';
import { OrgsActions } from 'src/features/orgs/orgsSlice';
import { PartyActions } from 'src/features/party/partySlice';
import { PDF_LAYOUT_NAME, PdfActions } from 'src/features/pdf/data/pdfSlice';
import { QueueActions } from 'src/features/queue/queueSlice';
import { TextResourcesActions } from 'src/features/textResources/textResourcesSlice';
import { getLayoutComponentObject } from 'src/layout';
import { ComponentType } from 'src/layout/LayoutComponent';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import { topLevelComponents } from 'src/utils/formLayout';
import { httpGet } from 'src/utils/network/networking';
import { pdfPreviewMode, shouldGeneratePdf } from 'src/utils/pdf';
import { getPdfFormatUrl } from 'src/utils/urls/appUrlHelper';
import type { IApplicationMetadata } from 'src/features/applicationMetadata';
import type { ExprUnresolved } from 'src/features/expressions/types';
import type { IPdfFormat, IPdfMethod } from 'src/features/pdf/data/types';
import type { ILayoutCompInstanceInformation } from 'src/layout/InstanceInformation/types';
import type { ILayout, ILayoutComponentOrGroup, ILayouts } from 'src/layout/layout';
import type { ILayoutCompSummary } from 'src/layout/Summary/types.d';
import type { ILayoutSets, IRuntimeState, IUiConfig } from 'src/types';
import type { IInstance } from 'src/types/shared';

const layoutSetsSelector = (state: IRuntimeState) => state.formLayout.layoutsets;
const layoutsSelector = (state: IRuntimeState) => state.formLayout.layouts;
const uiConfigSelector = (state: IRuntimeState) => state.formLayout.uiConfig;
const instanceSelector = (state: IRuntimeState) => state.instanceData.instance;
const applicationMetadataSelector = (state: IRuntimeState) => state.applicationMetadata.applicationMetadata;
const pdfFormatSelector = (state: IRuntimeState) => state.pdf.pdfFormat;
const pdfMethodSelector = (state: IRuntimeState) => state.pdf.method;

function generateAutomaticLayout(pdfFormat: IPdfFormat, uiConfig: IUiConfig, layouts: ILayouts): ILayout {
  const automaticPdfLayout: ILayout = [];

  const instanceInformation: ExprUnresolved<ILayoutCompInstanceInformation> = {
    id: '__pdf__instance-information',
    type: 'InstanceInformation',
    elements: {
      dateSent: true,
      sender: true,
      receiver: true,
      referenceNumber: true,
    },
    pageBreak: {
      breakAfter: 'always',
    },
  };
  automaticPdfLayout.push(instanceInformation);

  const excludedPages = new Set(pdfFormat?.excludedPages);
  const excludedComponents = new Set(pdfFormat?.excludedComponents);
  const hiddenPages = new Set(uiConfig.tracks.hidden);
  const pageOrder = uiConfig.tracks.order;

  Object.entries(layouts)
    .filter(([pageRef]) => !excludedPages.has(pageRef))
    .filter(([pageRef]) => !hiddenPages.has(pageRef))
    .filter(([pageRef]) => pageOrder?.includes(pageRef))
    .sort(([pA], [pB]) => (pageOrder ? pageOrder.indexOf(pA) - pageOrder.indexOf(pB) : 0))
    .map(([pageRef, layout]) => [
      pageRef,
      topLevelComponents(layout ?? []).filter((component) => !excludedComponents.has(component.id)),
    ])
    .flatMap(
      ([pageRef, components]: [string, ILayout]) =>
        components?.map((component) => [pageRef, component]) as [string, ILayoutComponentOrGroup][],
    )
    .map(([pageRef, component]) => {
      const layoutComponent = getLayoutComponentObject(component.type);

      if (
        component.type === 'Group' ||
        layoutComponent.type === ComponentType.Form ||
        layoutComponent.type === ComponentType.Presentation
      ) {
        return {
          id: `__pdf__${component.id}`,
          type: 'Summary',
          componentRef: component.id,
          pageRef,
          excludedChildren: pdfFormat?.excludedComponents,
        } as ExprUnresolved<ILayoutCompSummary>;
      }
      return null;
    })
    .forEach((summaryComponent) => {
      if (summaryComponent !== null) {
        automaticPdfLayout.push(summaryComponent);
      }
    });

  return automaticPdfLayout;
}

function* generatePdfSaga(): SagaIterator {
  try {
    const layouts: ILayouts = yield select(layoutsSelector);
    const uiConfig: IUiConfig = yield select(uiConfigSelector);
    const pdfFormat: IPdfFormat = yield select(pdfFormatSelector);
    const method: IPdfMethod = yield select(pdfMethodSelector);

    if (method == 'auto') {
      // Automatic layout
      const pdfLayout = generateAutomaticLayout(pdfFormat, uiConfig, layouts);
      yield put(FormLayoutActions.updateLayouts({ [PDF_LAYOUT_NAME]: pdfLayout }));
    }

    yield put(PdfActions.generateFulfilled());
  } catch (error) {
    yield put(PdfActions.generateRejected({ error }));
  }
}

function* fetchPdfFormatSaga(): SagaIterator {
  const layoutSets: ILayoutSets = yield select(layoutSetsSelector);
  const uiConfig: IUiConfig = yield select(uiConfigSelector);
  const instance: IInstance = yield select(instanceSelector);
  const applicationMetadata: IApplicationMetadata = yield select(applicationMetadataSelector);

  const dataGuid = getCurrentTaskDataElementId(applicationMetadata, instance, layoutSets);
  let pdfFormat: IPdfFormat;
  if (typeof dataGuid === 'string') {
    try {
      pdfFormat = yield call(httpGet, getPdfFormatUrl(instance.id, dataGuid));
    } catch {
      pdfFormat = {
        excludedPages: uiConfig.excludePageFromPdf ?? [],
        excludedComponents: uiConfig.excludeComponentFromPdf ?? [],
      };
    }
  } else {
    pdfFormat = {
      excludedPages: uiConfig.excludePageFromPdf ?? [],
      excludedComponents: uiConfig.excludeComponentFromPdf ?? [],
    };
  }
  yield put(PdfActions.pdfFormatFulfilled({ pdfFormat }));
}

/**
 * Watches for changes in formdata and calls fetchPdfFormat and regenerates pdf layout if the method is set to automatic
 */
export function* watchPdfPreviewSaga(): SagaIterator {
  while (true) {
    yield race([take(FormDataActions.submitFulfilled), take(PdfActions.pdfStateChanged)]);
    const method: IPdfMethod = yield select(pdfMethodSelector);
    if (method == 'auto' && pdfPreviewMode()) {
      yield call(fetchPdfFormatSaga);
      yield call(generatePdfSaga);
    }
  }
}

/**
 * Checks if all necessary data is loaded before signaling that pdf-generation is ready
 */
export function* watchPdfReadySaga(): SagaIterator {
  yield all([
    take(PartyActions.getPartiesFulfilled),
    take(LanguageActions.fetchLanguageFulfilled),
    take(TextResourcesActions.fetchFulfilled),
    take(OrgsActions.fetchFulfilled),
    take(OptionsActions.loaded),
    take(DataListsActions.loaded),
    take(IsLoadingActions.finishDataTaskIsLoading),
    race([
      take(FormLayoutActions.calculatePageOrderAndMoveToNextPageRejected),
      take(FormLayoutActions.calculatePageOrderAndMoveToNextPageFulfilled),
    ]),
  ]);

  yield put(PdfActions.pdfReady());
}

export function* watchInitialPdfSaga(): SagaIterator {
  while (true) {
    yield race([
      all([
        take(QueueActions.startInitialDataTaskQueueFulfilled),
        take(FormLayoutActions.fetchFulfilled),
        take(FormLayoutActions.fetchSettingsFulfilled),
        take(InstanceDataActions.getFulfilled),
      ]),
      take(PdfActions.pdfStateChanged),
    ]);
    if (shouldGeneratePdf()) {
      const layouts: ILayouts = yield select(layoutsSelector);
      const uiConfig: IUiConfig = yield select(uiConfigSelector);
      const customPdfLayout = uiConfig.pdfLayoutName ? layouts[uiConfig.pdfLayoutName] : undefined;
      const method = customPdfLayout ? 'custom' : 'auto';
      yield put(
        PdfActions.methodFulfilled({
          method,
        }),
      );
      if (method == 'auto') {
        yield call(fetchPdfFormatSaga);
      }
      yield call(generatePdfSaga);
    }
  }
}
