import React, { useEffect, useMemo } from 'react';

import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { usePdfLayoutName, useRawPageOrder } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { getComponentDef } from 'src/layout';
import { GeneratorInternal, GeneratorPageProvider } from 'src/utils/layout/generator/GeneratorContext';
import {
  GeneratorErrorBoundary,
  useGeneratorErrorBoundaryNodeRef,
} from 'src/utils/layout/generator/GeneratorErrorBoundary';
import { WhenParentAdded } from 'src/utils/layout/generator/GeneratorStages';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import type { CompExternalExact, CompTypes, ILayout } from 'src/layout/layout';
import type { NodeGeneratorProps } from 'src/layout/LayoutComponent';
import type { ChildClaim, ChildClaims } from 'src/utils/layout/generator/GeneratorContext';

export function LayoutSetGenerator() {
  const layouts = GeneratorInternal.useLayouts();

  return (
    layouts &&
    Object.keys(layouts).map((key) => {
      const layout = layouts[key];

      if (!layout) {
        return null;
      }

      return (
        <GeneratorErrorBoundary key={key}>
          <PageGenerator
            name={key}
            layout={layout}
          />
        </GeneratorErrorBoundary>
      );
    })
  );
}

interface PageProps {
  layout: ILayout;
  name: string;
}

function PageGenerator({ layout, name }: PageProps) {
  // eslint-disable-next-line react-compiler/react-compiler
  useGeneratorErrorBoundaryNodeRef().current = { type: 'page', id: name };

  const layoutLookups = useLayoutLookups();
  const topLevel = layoutLookups.topLevelComponents[name];
  const pageOrder = useRawPageOrder();
  const pdfPage = usePdfLayoutName();
  const isValid = pageOrder.includes(name) || name === pdfPage;

  const topLevelIdsAsClaims = useMemo(() => {
    const claims: ChildClaims = {};
    for (const id of topLevel || []) {
      claims[id] = {};
    }
    return claims;
  }, [topLevel]);

  if (layout.length === 0) {
    return null;
  }

  return (
    <>
      <AddPage name={name} />
      <GeneratorPageProvider
        pageKey={name}
        isValid={isValid}
      >
        <GenerateNodeChildren
          claims={topLevelIdsAsClaims}
          pluginKey={undefined}
        />
      </GeneratorPageProvider>
    </>
  );
}

interface CommonProps {
  name: string;
}

function AddPage({ name }: CommonProps) {
  const addPage = NodesInternal.useAddPage();

  useEffect(() => {
    addPage(name);
  }, [addPage, name]);

  return null;
}

function useFilteredClaims(claims: ChildClaims | undefined, pluginKey: string | undefined) {
  return useMemo(() => {
    if (!pluginKey) {
      return claims ?? {};
    }

    const out: ChildClaims = {};
    for (const id in claims) {
      if (claims[id].pluginKey === pluginKey) {
        out[id] = claims[id];
      }
    }
    return out;
  }, [claims, pluginKey]);
}

interface NodeChildrenProps {
  claims: ChildClaims | undefined;
  pluginKey: string | undefined;
}

export function GenerateNodeChildren({ claims, pluginKey }: NodeChildrenProps) {
  const layoutMap = useLayoutLookups().allComponents;
  const filteredClaims = useFilteredClaims(claims, pluginKey);
  const map = useLayoutLookups().childClaims;

  return (
    <WhenParentAdded>
      {Object.keys(filteredClaims).map((id) => {
        const layout = layoutMap[id];
        if (!layout) {
          return null;
        }

        return (
          <GeneratorErrorBoundary key={id}>
            <GenerateComponent
              layout={layout}
              claim={filteredClaims[id]}
              childClaims={map[id]}
            />
          </GeneratorErrorBoundary>
        );
      })}
    </WhenParentAdded>
  );
}

interface ComponentProps {
  layout: CompExternalExact<CompTypes>;
  claim: ChildClaim;
  childClaims: ChildClaims | undefined;
}

const emptyObject = {};
function GenerateComponent({ layout, claim, childClaims }: ComponentProps) {
  const def = getComponentDef(layout.type);
  const props: NodeGeneratorProps = useMemo(
    () => ({
      claim,
      externalItem: layout,
      childClaims: childClaims ?? emptyObject,
    }),
    [claim, layout, childClaims],
  );

  if (!layout.id && layout.type) {
    window.logError(`Encountered '${layout.type}' component with no ID (ignoring)`);
    return null;
  }

  if (!layout.id) {
    window.logError(`Encountered component with no ID (ignoring)`);
    return null;
  }

  if (!def || !layout.type) {
    window.logError(`No component definition found for type '${layout.type}' (component '${layout.id}')`);
    return null;
  }

  return def.renderNodeGenerator(props);
}
