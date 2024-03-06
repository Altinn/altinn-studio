import React, { useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { createStore } from 'zustand';

import { ContextNotProvided } from 'src/core/contexts/context';
import { createZustandContext } from 'src/core/contexts/zustandContext';
import { useCurrentDataModelSchema } from 'src/features/datamodel/DataModelSchemaProvider';
import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { useCurrentDataModelType } from 'src/features/datamodel/useBindingSchema';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { useLayoutSchemaValidation } from 'src/features/devtools/layoutValidation/useLayoutSchemaValidation';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import { useIsDev } from 'src/hooks/useIsDev';
import { useCurrentView } from 'src/hooks/useNavigatePage';
import { useNodes } from 'src/utils/layout/NodesContext';
import { getRootElementPath } from 'src/utils/schemaUtils';
import { duplicateStringFilter } from 'src/utils/stringHelper';
import type { LayoutValidationErrors } from 'src/features/devtools/layoutValidation/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface LayoutValidationProps {
  logErrors?: boolean;
}

function mergeValidationErrors(a: LayoutValidationErrors, b: LayoutValidationErrors): LayoutValidationErrors {
  const out: LayoutValidationErrors = structuredClone(a);

  for (const [layoutSetId, layouts] of Object.entries(b)) {
    if (out[layoutSetId]) {
      for (const [pageName, layout] of Object.entries(layouts)) {
        if (out[layoutSetId][pageName]) {
          for (const [componentId, errors] of Object.entries(layout)) {
            if (out[layoutSetId][pageName][componentId]) {
              out[layoutSetId][pageName][componentId] = [...out[layoutSetId][pageName][componentId], ...errors].filter(
                duplicateStringFilter,
              );
            } else {
              out[layoutSetId][pageName][componentId] = errors;
            }
          }
        } else {
          out[layoutSetId][pageName] = layout;
        }
      }
    } else {
      out[layoutSetId] = layouts;
    }
  }

  return out;
}

/**
 * Validates a layout page against the current data model schema (looking up bindings in the schema).
 *
 * You can call this without specifying the repeating groups state, as we'll generate a simple state for you where
 * every repeating group has one row (thus making every possible component appear in the layout).
 */
function useDataModelBindingsValidation(props: LayoutValidationProps) {
  const layoutSetId = useCurrentLayoutSetId() || 'default';
  const { logErrors = false } = props;
  const schema = useCurrentDataModelSchema();
  const dataType = useCurrentDataModelType();
  const nodes = useNodes();

  return useMemo(() => {
    const failures: LayoutValidationErrors = {
      [layoutSetId]: {},
    };
    if (!schema) {
      return failures;
    }
    const rootElementPath = getRootElementPath(schema, dataType);

    const lookupBinding = (binding: string) =>
      lookupBindingInSchema({
        schema,
        rootElementPath,
        targetPointer: dotNotationToPointer(binding),
      });

    for (const [pageName, layout] of Object.entries(nodes.all())) {
      for (const node of layout.flat(true)) {
        if ('validateDataModelBindings' in node.def) {
          const errors = node.def.validateDataModelBindings({
            node: node as any,
            lookupBinding,
          });
          if (errors.length) {
            const id = node.item.baseComponentId || node.item.id;
            failures[layoutSetId][pageName] = failures[layoutSetId][pageName] ?? {};
            failures[layoutSetId][pageName][id] = errors;

            if (logErrors) {
              window.logErrorOnce(
                `Data model binding errors for component '${layoutSetId}/${pageName}/${id}':\n- ${errors.join('\n- ')}`,
              );
            }
          }
        }
      }
    }

    return failures;
  }, [layoutSetId, schema, dataType, nodes, logErrors]);
}

interface Context {
  errors: LayoutValidationErrors | undefined;
  update: (
    dataModelBindingsValidations: LayoutValidationErrors,
    layoutSchemaValidations: LayoutValidationErrors | undefined,
  ) => void;
}

function initialCreateStore() {
  return createStore<Context>((set) => ({
    errors: undefined,
    update: (dataModelBindingsValidations, layoutSchemaValidations) => {
      if (!layoutSchemaValidations) {
        return set({ errors: undefined });
      }
      return set({ errors: mergeValidationErrors(dataModelBindingsValidations, layoutSchemaValidations) });
    },
  }));
}

const { Provider, useLaxSelector, useSelector } = createZustandContext({
  name: 'LayoutValidation',
  required: true,
  initialCreateStore,
});

export const useLayoutValidation = () => {
  const out = useLaxSelector((state) => state.errors);
  return out === ContextNotProvided ? undefined : out;
};

export const useLayoutValidationForPage = () => {
  const layoutSetId = useCurrentLayoutSetId() || 'default';
  const currentView = useCurrentView();

  return useLaxSelector((state) => {
    const layoutSet = state.errors?.[layoutSetId];
    return layoutSet && currentView ? layoutSet[currentView] : undefined;
  });
};

export const useLayoutValidationForNode = (node: LayoutNode) => {
  const componentId = node.item.baseComponentId || node.item.id;
  const pageName = node.top.top.myKey;
  const layoutSetId = useCurrentLayoutSetId() || 'default';

  return useLaxSelector((state) => state.errors?.[layoutSetId]?.[pageName]?.[componentId]);
};

export function LayoutValidationProvider({ children }: PropsWithChildren) {
  return (
    <Provider>
      <Generator />
      {children}
    </Provider>
  );
}

export function Generator() {
  const isDev = useIsDev();
  const panelOpen = useDevToolsStore((s) => s.isOpen);
  const enabled = isDev || panelOpen;

  const layoutSchemaValidations = useLayoutSchemaValidation(enabled);
  const dataModelBindingsValidations = useDataModelBindingsValidation({ logErrors: true });

  const update = useSelector((state) => state.update);

  useEffect(() => {
    update(dataModelBindingsValidations, layoutSchemaValidations);
  }, [update, dataModelBindingsValidations, layoutSchemaValidations]);

  return null;
}
