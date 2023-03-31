import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { FormDynamicsActions } from 'src/features/dynamics/formDynamicsSlice';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { FormLayoutActions } from 'src/features/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/validation/validationSlice';
import { Triggers } from 'src/types';
import { runConditionalRenderingRules } from 'src/utils/conditionalRendering';
import { dataSourcesFromState, ResolvedNodesSelector } from 'src/utils/layout/hierarchy';
import { selectNotNull } from 'src/utils/sagas';
import type { ICheckIfConditionalRulesShouldRun, IConditionalRenderingRules } from 'src/features/dynamics/index';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { ExprConfig, ExprUnresolved } from 'src/features/expressions/types';
import type { IFormData } from 'src/features/formData';
import type { IHiddenLayoutsExpressions, IRuntimeState, IUiConfig, IValidations } from 'src/types';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

export const ConditionalRenderingSelector = (store: IRuntimeState) => store.formDynamics.conditionalRendering;
export const FormDataSelector = (state: IRuntimeState) => state.formData.formData;
export const RepeatingGroupsSelector = (state: IRuntimeState) => state.formLayout.uiConfig.repeatingGroups;
export const UiConfigSelector = (state: IRuntimeState) => state.formLayout.uiConfig;
export const FormValidationSelector = (state: IRuntimeState) => state.formValidations.validations;
export const DataSourcesSelector = (state: IRuntimeState) => dataSourcesFromState(state);

export function* checkIfConditionalRulesShouldRunSaga({
  payload: { preventRecursion = false },
}: PayloadAction<ICheckIfConditionalRulesShouldRun>): SagaIterator {
  try {
    const conditionalRenderingState: IConditionalRenderingRules = yield select(ConditionalRenderingSelector);
    const formData: IFormData = yield select(FormDataSelector);
    const formValidations: IValidations = yield select(FormValidationSelector);
    const repeatingGroups = yield selectNotNull(RepeatingGroupsSelector);
    const uiConfig: IUiConfig = yield select(UiConfigSelector);
    const resolvedNodes: LayoutPages = yield select(ResolvedNodesSelector);
    const dataSources = yield select(DataSourcesSelector);

    const hiddenFields = new Set(uiConfig.hiddenFields);
    const futureHiddenFields = runConditionalRenderingRules(conditionalRenderingState, formData, repeatingGroups);

    runExpressionRules(resolvedNodes, futureHiddenFields);

    const hiddenLayouts = new Set(uiConfig.tracks.hidden);
    const futureHiddenLayouts = runExpressionsForLayouts(resolvedNodes, uiConfig.tracks.hiddenExpr, dataSources);

    let runTwice = false;
    if (shouldUpdate(hiddenLayouts, futureHiddenLayouts)) {
      yield put(
        FormLayoutActions.updateHiddenLayouts({
          hiddenLayouts: [...futureHiddenLayouts.values()],
        }),
      );
      // Hide all fields in hidden layouts. If fields have been hidden because pages are hidden, we need to re-run
      // these checks later, since component lookups that did not resolve back then might resolve now.
      runTwice = true;
    }

    for (const layout of futureHiddenLayouts) {
      for (const node of resolvedNodes.findLayout(layout)?.flat(true) || []) {
        if (!futureHiddenFields.has(node.item.id)) {
          futureHiddenFields.add(node.item.id);
        }
      }
    }

    if (shouldUpdate(hiddenFields, futureHiddenFields)) {
      yield put(
        FormLayoutActions.updateHiddenComponents({
          componentsToHide: [...futureHiddenFields.values()],
        }),
      );

      const newlyHidden = Array.from(futureHiddenFields).filter((i) => !hiddenFields.has(i));
      const newlyVisible = Array.from(hiddenFields).filter((i) => !futureHiddenFields.has(i));
      const newFormValidations: IValidations = JSON.parse(JSON.stringify(formValidations));
      let validationsChanged = false;
      for (const layoutId of Object.keys(newFormValidations)) {
        const layout = newFormValidations[layoutId];
        const layoutObj = resolvedNodes.findLayout(layoutId);
        for (const componentId of newlyHidden) {
          if (layout[componentId]) {
            delete layout[componentId];
            validationsChanged = true;
          }
        }
        for (const componentId of newlyVisible) {
          const node = layoutObj?.findById(componentId) || resolvedNodes.findById(componentId);
          if (
            node &&
            node.item.dataModelBindings &&
            node.item.triggers &&
            node.item.triggers.includes(Triggers.Validation)
          ) {
            for (const dataModelBinding of Object.values(node.item.dataModelBindings)) {
              yield put(
                ValidationActions.runSingleFieldValidation({
                  componentId,
                  layoutId,
                  dataModelBinding,
                }),
              );
            }
          }
        }
      }
      if (validationsChanged) {
        yield put(
          ValidationActions.updateValidations({
            validations: newFormValidations,
          }),
        );
      }
    }

    if (runTwice && !preventRecursion) {
      yield put(
        FormDynamicsActions.checkIfConditionalRulesShouldRun({
          preventRecursion: true,
        }),
      );
    }
  } catch (err) {
    yield call(console.error, err);
  }
}

function runExpressionRules(layouts: LayoutPages, future: Set<string>) {
  const shouldIncludeGroups = true;
  const shouldRespectLegacyHidden = false;
  for (const layout of Object.values(layouts.all())) {
    for (const node of layout.flat(shouldIncludeGroups)) {
      if (node.isHidden(shouldRespectLegacyHidden)) {
        future.add(node.item.id);
      }
    }
  }
}

function runExpressionsForLayouts(
  nodes: LayoutPages,
  hiddenLayoutsExpr: ExprUnresolved<IHiddenLayoutsExpressions>,
  dataSources: ContextDataSources,
): Set<string> {
  const config: ExprConfig<ExprVal.Boolean> = {
    returnType: ExprVal.Boolean,
    defaultValue: false,
    resolvePerRow: false,
  };

  const hiddenLayouts: Set<string> = new Set();
  for (const key of Object.keys(hiddenLayoutsExpr)) {
    const layout = nodes.findLayout(key);
    if (!layout) {
      continue;
    }

    let isHidden = hiddenLayoutsExpr[key];
    if (typeof isHidden === 'object' && isHidden !== null) {
      isHidden = evalExpr(isHidden, layout, dataSources, { config }) as boolean;
    }
    if (isHidden === true) {
      hiddenLayouts.add(key);
    }
  }

  return hiddenLayouts;
}

function shouldUpdate(currentList: Set<string>, newList: Set<string>): boolean {
  if (currentList.size !== newList.size) {
    return true;
  }

  const present = [...currentList.values()].sort();
  const future = [...newList.values()].sort();

  return JSON.stringify(present) !== JSON.stringify(future);
}
