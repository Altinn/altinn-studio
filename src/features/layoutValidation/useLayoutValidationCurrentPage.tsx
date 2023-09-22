import React, { useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { dotNotationToPointer } from 'src/features/datamodel/notations';
import { lookupBindingInSchema } from 'src/features/datamodel/SimpleSchemaTraversal';
import { useCurrentDataModelSchema, useCurrentDataModelType } from 'src/features/datamodel/useBindingSchema';
import { generateSimpleRepeatingGroups } from 'src/features/layout/repGroups/generateSimpleRepeatingGroups';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLayoutComponentObject } from 'src/layout';
import { createStrictContext } from 'src/utils/createStrictContext';
import { selectDataSourcesFromState } from 'src/utils/layout/hierarchy';
import { generateEntireHierarchy } from 'src/utils/layout/HierarchyGenerator';
import { getRootElementPath } from 'src/utils/schemaUtils';
import type { ILayout } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';

export interface LayoutValidationComponentErrors {
  [componentId: string]: string[];
}

export interface LayoutValidationProps {
  layout: ILayout | undefined;
  repeatingGroups?: IRepeatingGroups;
  logErrors?: boolean;
}

/**
 * Validates a layout page against the current data model schema (looking up bindings in the schema).
 *
 * You can call this without specifying the repeating groups state, as we'll generate a simple state for you where
 * every repeating group has one row (thus making every possible component appear in the layout).
 */
function useLayoutValidationGenerator(props: LayoutValidationProps) {
  const { layout, repeatingGroups: _repeatingGroups, logErrors = false } = props;
  const repeatingGroups = useMemo(
    () => _repeatingGroups ?? generateSimpleRepeatingGroups({ layout }),
    [_repeatingGroups, layout],
  );
  const schema = useCurrentDataModelSchema();
  const dataType = useCurrentDataModelType();
  const dataSources = useAppSelector(selectDataSourcesFromState);
  const nodes = useMemo(
    () => generateEntireHierarchy({ layout }, 'layout', repeatingGroups, dataSources, getLayoutComponentObject),
    [layout, repeatingGroups, dataSources],
  );

  return useMemo(() => {
    const failures: LayoutValidationComponentErrors = {};
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

    for (const [, layout] of Object.entries(nodes.all())) {
      for (const node of layout.flat(true)) {
        if ('validateDataModelBindings' in node.def) {
          const errors = node.def.validateDataModelBindings({
            node: node as any,
            lookupBinding,
          });
          if (errors.length) {
            const id = node.item.baseComponentId || node.item.id;
            failures[id] = errors;

            if (logErrors) {
              for (const error of errors) {
                window.logErrorOnce(`Validation errors for component '${id}': ${error}`);
              }
            }
          }
        }
      }
    }

    return failures;
  }, [schema, dataType, nodes, logErrors]);
}

const [Provider, useLayoutValidationCtx] = createStrictContext<LayoutValidationComponentErrors>();

export const useLayoutValidationCurrentPage = useLayoutValidationCtx;

export function LayoutValidationProvider(props: PropsWithChildren) {
  const currentLayout = useAppSelector((state) =>
    state.formLayout.layouts ? state.formLayout.layouts[state.formLayout.uiConfig.currentView] : undefined,
  );
  const value = useLayoutValidationGenerator({ layout: currentLayout, logErrors: true });
  return <Provider value={value}>{props.children}</Provider>;
}
