import { call, put, select } from 'redux-saga/effects';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { SagaIterator } from 'redux-saga';

import { evalExpr } from 'src/features/expressions';
import { FormDynamicsActions } from 'src/features/form/dynamics/formDynamicsSlice';
import { FormLayoutActions } from 'src/features/form/layout/formLayoutSlice';
import { ValidationActions } from 'src/features/form/validation/validationSlice';
import { Triggers } from 'src/types';
import { runConditionalRenderingRules } from 'src/utils/conditionalRendering';
import { dataSourcesFromState, resolvedLayoutsFromState } from 'src/utils/layout/hierarchy';
import { selectNotNull } from 'src/utils/sagas';
import type { ContextDataSources } from 'src/features/expressions/ExprContext';
import type { IFormData } from 'src/features/form/data';
import type { ICheckIfConditionalRulesShouldRun, IConditionalRenderingRules } from 'src/features/form/dynamics';
import type { IHiddenLayoutsExpressions, IRuntimeState, IUiConfig, IValidations } from 'src/types';
import type { LayoutRootNodeCollection } from 'src/utils/layout/hierarchy';

export const ConditionalRenderingSelector = (store: IRuntimeState) => store.formDynamics.conditionalRendering;
export const FormDataSelector = (state: IRuntimeState) => state.formData.formData;
export const RepeatingGroupsSelector = (state: IRuntimeState) => state.formLayout.uiConfig.repeatingGroups;
export const UiConfigSelector = (state: IRuntimeState) => state.formLayout.uiConfig;
export const FormValidationSelector = (state: IRuntimeState) => state.formValidations.validations;
export const ResolvedNodesSelector = (state: IRuntimeState) => resolvedLayoutsFromState(state);
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
    const resolvedNodes: LayoutRootNodeCollection<'resolved'> = yield select(ResolvedNodesSelector);
    const dataSources = yield select(DataSourcesSelector);

    const hiddenFields = new Set(uiConfig.hiddenFields);
    const futureHiddenFields = runConditionalRenderingRules(conditionalRenderingState, formData, repeatingGroups);

    runExpressionRules(resolvedNodes, hiddenFields, futureHiddenFields);

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
      for (const node of resolvedNodes.findLayout(layout).flat(true)) {
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
          const node = layoutObj.findById(componentId);
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

function runExpressionRules(layouts: LayoutRootNodeCollection<'resolved'>, present: Set<string>, future: Set<string>) {
  for (const layout of Object.values(layouts.all())) {
    for (const node of layout.flat(true)) {
      if (node.item.hidden === true || future.has(node.item.id)) {
        future.add(node.item.id);
        for (const childNode of node.children().flat()) {
          future.add(childNode.item.id);
        }
      }
    }
  }
}

function runExpressionsForLayouts(
  nodes: LayoutRootNodeCollection<'resolved'>,
  hiddenLayoutsExpr: IHiddenLayoutsExpressions,
  dataSources: ContextDataSources,
): Set<string> {
  const hiddenLayouts: Set<string> = new Set();
  for (const key of Object.keys(hiddenLayoutsExpr)) {
    let isHidden = hiddenLayoutsExpr[key];
    if (typeof isHidden === 'object' && isHidden !== null) {
      isHidden = evalExpr(isHidden, nodes.findLayout(key), dataSources, {
        defaultValue: false,
      });
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
