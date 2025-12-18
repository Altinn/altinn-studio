import dot from 'dot-object';
import { produce } from 'immer';
import { API_CLIENT } from 'nextsrc/nextpoc/app/App/App';
import { evaluateExpression } from 'nextsrc/nextpoc/app/expressions/evaluateExpression';
import { isFormComponentProps } from 'nextsrc/nextpoc/app/hooks/useValidateComponent';
import { moveChildren } from 'nextsrc/nextpoc/app/utils/moveChildren';
import { createStore } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import type { JSONSchema7 } from 'json-schema';
import type { LayoutSetsSchema } from 'nextsrc/nextpoc/types/LayoutSetsDTO';
import type { PageOrderDTO } from 'nextsrc/nextpoc/types/PageOrderDTO';
import type { ProcessSchema } from 'nextsrc/nextpoc/types/ProcessDTO';

import type { Expression, ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { CompExternal, ILayoutCollection } from 'src/layout/layout';

export interface DataObject {
  [key: string]: string | null | object | DataObject | undefined;
}

export type ResolvedCompExternal = CompExternal & ExtraProps;

interface ExtraProps {
  children: ResolvedCompExternal[] | undefined;
}

export interface ResolvedLayoutFile {
  $schema?: string;
  data: { layout: ResolvedCompExternal[]; hidden?: ExprValToActualOrExpr<ExprVal.Boolean>; expandedWidth?: boolean };
}

export type ResolvedLayoutCollection = { [pageName: string]: ResolvedLayoutFile };

// Expression cache - lives outside store to avoid triggering re-renders
const expressionCache = new Map<string, unknown>();

function getCacheKey(expr: Expression, parentBinding?: string, itemIndex?: number): string {
  return JSON.stringify({ expr, parentBinding, itemIndex });
}

interface Layouts {
  layoutSetsConfig: LayoutSetsSchema;
  process: ProcessSchema;
  pageOrder: PageOrderDTO;
  layouts: ResolvedLayoutCollection;
  resolvedLayouts: ResolvedLayoutCollection;
  data: DataObject | undefined;
  dataModelSchemas?: Record<string, JSONSchema7>;
  componentMap?: Record<string, ResolvedCompExternal>;
  options?: Record<string, any>;
  setLayoutSets: (schema: LayoutSetsSchema) => void;
  setProcess: (proc: ProcessSchema) => void;
  setPageOrder: (order: PageOrderDTO) => void;
  setLayouts: (layouts: ILayoutCollection) => void;
  setDataObject: (data: DataObject) => void;
  setDataValue: (key: string, value: string | boolean) => void;
  setBoundValue: (
    component: ResolvedCompExternal,
    newValue: any,
    parentBinding?: string,
    itemIndex?: number,
    childField?: string,
  ) => void;
  updateResolvedLayouts: () => void; // if you need it
  evaluateExpression: (expr: Expression, parentBinding?: string, itemIndex?: number) => any;
  validateComponent: (
    component: ResolvedCompExternal,
    parentBinding?: string,
    itemIndex?: number,
    childField?: string,
  ) => string[];
  getBoundValue: (
    component: ResolvedCompExternal,
    parentBinding?: string,
    itemIndex?: number,
    childField?: string,
  ) => any;
  setDataModelSchema: (dataModelName: string, dataModelSchema: JSONSchema7) => void;
  addRow: (dataModelBinding: string, parentBinding?: string, itemIndex?: number, childField?: string) => void;
}

function buildComponentMap(collection: ResolvedLayoutCollection) {
  const map: Record<string, ResolvedCompExternal> = {};

  function traverse(components: ResolvedCompExternal[] | undefined) {
    if (!Array.isArray(components)) {
      return;
    }

    for (const comp of components) {
      if (comp.id) {
        map[comp.id] = comp;
      }

      if (Array.isArray(comp.children)) {
        traverse(comp.children as ResolvedCompExternal[]);
      }
    }
  }

  // For each page in the layout, traverse its layout array
  for (const pageId of Object.keys(collection)) {
    const layout = collection[pageId]?.data?.layout;
    traverse(layout);
  }

  return map;
}

function getDistinctOptionsIds(data: Record<string, any>): string[] {
  const results = new Set<string>();
  for (const key in data) {
    if (data[key]?.optionsId) {
      results.add(data[key].optionsId);
    }
  }
  return Array.from(results);
}

export const layoutStore = createStore<Layouts>()(
  subscribeWithSelector(
    devtools(
      (set, get) => ({
        data: undefined,
        setLayoutSets: (schema) => set({ layoutSetsConfig: schema }),
        setProcess: (proc) => set({ process: proc }),
        setPageOrder: (order) => set({ pageOrder: order }),

        setLayouts: async (newLayouts) => {
          if (!newLayouts) {
            throw new Error('no layouts');
          }

          // 1) Wrap and restructure your incoming layouts, same as before
          const resolvedLayoutCollection: any = {};
          Object.keys(newLayouts).forEach((key) => {
            resolvedLayoutCollection[key] = {
              ...newLayouts[key],
              data: {
                ...newLayouts[key].data,
                layout: moveChildren(newLayouts[key]).data.layout,
              },
            };
          });

          const compMap = buildComponentMap(resolvedLayoutCollection);

          const distinctOptionIds = getDistinctOptionsIds(compMap);

          const fetchPromises = distinctOptionIds.map(async (id) => {
            // Adjust org/app to whatever you have in your context
            const org = window.org;
            const app = window.app;

            // Possibly also pass language/queryParams:
            const response = await API_CLIENT.org.optionsDetail(
              id,
              org,
              app,
              { language: 'nb' }, // example
            );
            const data = await response.json();
            set((state) =>
              produce(state, (draft) => {
                if (!draft.options) {
                  draft.options = {};
                }
                draft.options[id] = data;
              }),
            );
          });

          if (fetchPromises.length > 0) {
            await Promise.all(fetchPromises);
          }

          set({
            layouts: resolvedLayoutCollection,
            componentMap: compMap,
          });
        },

        setDataObject: (newData) => {
          expressionCache.clear();
          set({ data: newData });
        },

        evaluateExpression: (expr: Expression, parentBinding?: string, itemIndex?: number) => {
          const cacheKey = getCacheKey(expr, parentBinding, itemIndex);

          if (expressionCache.has(cacheKey)) {
            return expressionCache.get(cacheKey);
          }

          const { data, componentMap } = get();
          if (!data) {
            throw new Error('No data available in store');
          }

          const result = evaluateExpression(expr, data, componentMap, parentBinding, itemIndex);
          expressionCache.set(cacheKey, result);
          return result;
        },

        validateComponent: (
          component: ResolvedCompExternal,
          parentBinding?: string,
          itemIndex?: number,
          childField?: string,
        ) => {
          if (!isFormComponentProps(component)) {
            return [];
          }
          const errors: string[] = [];

          const currentValue = get().getBoundValue(component, parentBinding, itemIndex, childField);

          let isRequired: boolean;

          if (!Array.isArray(component.required)) {
            isRequired = !!component.required;
          }

          const { evaluateExpression } = get();

          // @ts-ignore
          isRequired = evaluateExpression(component.required, parentBinding, itemIndex);

          if (isRequired) {
            if (!currentValue) {
              errors.push('This value is required');
            }
          }
          return errors;
        },

        getBoundValue: (component, parentBinding, itemIndex, _) => {
          const data = get().data;
          if (!data) {
            return undefined;
          }

          // @ts-ignore
          const simple = component.dataModelBindings?.simpleBinding;

          if (!simple) {
            return undefined;
          }

          const splittedBinding = simple ? simple.split('.') : [];

          const binding =
            parentBinding !== undefined
              ? `${parentBinding}[${itemIndex}].${splittedBinding[splittedBinding.length - 1] || ''}`
              : simple;

          return dot.pick(binding, data);
        },

        setBoundValue: (component, newValue, parentBinding, itemIndex) => {
          // @ts-ignore
          const simple = component.dataModelBindings?.simpleBinding;
          if (!simple) {
            return;
          }

          const parts = simple.split('.');
          const binding = parentBinding !== undefined ? `${parentBinding}[${itemIndex}].${parts.at(-1) ?? ''}` : simple;

          set((state) => {
            if (!state.data) {
              throw new Error('No data object');
            }

            const currentVal = dot.pick(binding, state.data);
            if (currentVal === newValue) {
              return {};
            }

            expressionCache.clear();
            const nextData = { ...state.data };
            dot.set(binding, newValue, nextData);

            return { data: nextData };
          });
        },

        setDataModelSchema: (dataModelName: string, dataModelSchema: JSONSchema7) => {
          set((state) =>
            produce(state, (draft) => {
              if (!draft.dataModelSchemas) {
                draft.dataModelSchemas = {};
              }
              draft.dataModelSchemas[dataModelName] = dataModelSchema;
            }),
          );
        },

        addRow: (dataModelBinding: string, parentBinding?: string, itemIndex?: number) => {
          set((state) =>
            produce(state, (draft) => {
              if (!state.dataModelSchemas) {
                throw new Error('Tried to add a row without a data model schema loaded.');
              }

              if (!draft.data) {
                throw new Error('tried to set data before data is loaded, this is an error');
              }

              const schema = state.dataModelSchemas['model'];

              let path = '';

              if (parentBinding) {
                path = `properties.${dataModelBinding.replace('.', '.items.properties.')}.items.properties`;
              } else {
                path = `properties.${dataModelBinding}.items.properties`;
              }

              const propsToAdd = dot.pick(path, schema);

              const binding = parentBinding
                ? `${parentBinding}[${itemIndex}].${dataModelBinding.split('.')[1] || ''}`
                : dataModelBinding;

              let currentValue = dot.pick(binding, draft.data);
              if (!Array.isArray(currentValue)) {
                currentValue = [];
                dot.set(binding, currentValue, draft.data);
              }

              const newRow: Record<string, any> = {};
              for (const key of Object.keys(propsToAdd)) {
                newRow[key] = null;
              }

              currentValue.push(newRow);
            }),
          );
        },
      }),
      {
        name: 'LayoutStore',
      },
    ),
  ),
);
