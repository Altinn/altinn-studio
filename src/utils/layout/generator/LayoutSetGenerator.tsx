import React, { useEffect, useMemo } from 'react';

import { ExprVal } from 'src/features/expressions/types';
import { useHiddenLayoutsExpressions, useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { usePdfLayoutName, useRawPageOrder } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { getComponentDef } from 'src/layout';
import { NodesStateQueue } from 'src/utils/layout/generator/CommitQueue';
import { GeneratorDebug } from 'src/utils/layout/generator/debug';
import { GeneratorInternal, GeneratorPageProvider } from 'src/utils/layout/generator/GeneratorContext';
import {
  GeneratorErrorBoundary,
  useGeneratorErrorBoundaryNodeRef,
} from 'src/utils/layout/generator/GeneratorErrorBoundary';
import { GeneratorCondition, StageAddNodes, StageMarkHidden } from 'src/utils/layout/generator/GeneratorStages';
import { useEvalExpressionInGenerator } from 'src/utils/layout/generator/useEvalExpression';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { Hidden, NodesInternal, NodesStore, useNodes } from 'src/utils/layout/NodesContext';
import type { CompExternal, CompExternalExact, CompTypes, ILayout } from 'src/layout/layout';
import type { NodeGeneratorProps } from 'src/layout/LayoutComponent';
import type { ChildClaim, ChildClaims } from 'src/utils/layout/generator/GeneratorContext';
import type { LayoutPages } from 'src/utils/layout/LayoutPages';

const style: React.CSSProperties = GeneratorDebug.displayState
  ? {
      display: 'block',
      position: 'fixed',
      top: '0',
      left: '0',
      zIndex: 1000,
      backgroundColor: 'white',
      padding: '10px',
      borderRight: '1px solid red',
      maxWidth: '40vw',
      height: '100vh',
      overflow: 'auto',
    }
  : { display: 'none' };

export function LayoutSetGenerator() {
  const layouts = GeneratorInternal.useLayouts();
  const pages = useNodes();

  const children = (
    <>
      <ExportStores />
      {GeneratorDebug.displayState && <h1>Node generator</h1>}
      {layouts &&
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
                layoutSet={pages}
              />
            </GeneratorErrorBoundary>
          );
        })}
    </>
  );

  return <div style={style}>{children}</div>;
}

function ExportStores() {
  const nodesStore = NodesInternal.useStore();

  useEffect(() => {
    window.CypressState = window.CypressState || {};
    window.CypressState.nodesStore = nodesStore;
  }, [nodesStore]);

  return null;
}

interface PageProps {
  layout: ILayout;
  name: string;
  layoutSet: LayoutPages;
}

function PageGenerator({ layout, name, layoutSet }: PageProps) {
  const page = useMemo(() => new LayoutPage(), []);
  useGeneratorErrorBoundaryNodeRef().current = page;
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
      <AddPage
        layoutSet={layoutSet}
        page={page}
        name={name}
      />
      <GeneratorCondition stage={StageMarkHidden}>
        <MarkPageHidden
          page={page}
          name={name}
        />
      </GeneratorCondition>
      {GeneratorDebug.displayState && <h2>Page: {name}</h2>}
      <GeneratorPageProvider
        parent={page}
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
  layoutSet: LayoutPages;
  page: LayoutPage;
  name: string;
}

function AddPage({ layoutSet, page, name }: CommonProps) {
  const addPage = NodesInternal.useAddPage();

  useEffect(() => {
    addPage(name);
    if (!page.isRegisteredInCollection(layoutSet)) {
      page.registerCollection(name, layoutSet);
    }
  }, [addPage, page, name, layoutSet]);

  return null;
}

function MarkPageHidden({ name, page }: Omit<CommonProps, 'layoutSet'>) {
  const inOrder = Hidden.useIsPageInOrder(name);
  const hidden = useIsHiddenPage(page);

  const hiddenIsSet = NodesStore.useSelector((state) => state.pagesData.pages[name]?.hidden === hidden);
  const inOrderIsSet = NodesStore.useSelector((state) => state.pagesData.pages[name]?.inOrder === inOrder);

  NodesStateQueue.useSetPageProp({ pageKey: name, prop: 'hidden', value: hidden }, !hiddenIsSet);
  NodesStateQueue.useSetPageProp({ pageKey: name, prop: 'inOrder', value: inOrder }, !inOrderIsSet);

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

  return (
    <GeneratorCondition
      stage={StageAddNodes}
      mustBeAdded='parent'
    >
      <GenerateNodeChildrenInternal
        claims={filteredClaims}
        layoutMap={layoutMap}
      />
    </GeneratorCondition>
  );
}

interface NodeChildrenStaticLayoutProps {
  staticLayoutMap: Record<string, CompExternal>;
  claims: ChildClaims;
  pluginKey?: string;
}

export function GenerateNodeChildrenWithStaticLayout({
  claims,
  pluginKey,
  staticLayoutMap,
}: NodeChildrenStaticLayoutProps) {
  const filteredClaims = useFilteredClaims(claims, pluginKey);

  return (
    <GeneratorCondition
      stage={StageAddNodes}
      mustBeAdded='parent'
    >
      <GenerateNodeChildrenInternal
        claims={filteredClaims}
        layoutMap={staticLayoutMap}
      />
    </GeneratorCondition>
  );
}

interface NodeChildrenInternalProps {
  claims: ChildClaims;
  layoutMap: Record<string, CompExternal | undefined>;
}

function GenerateNodeChildrenInternal({ claims, layoutMap }: NodeChildrenInternalProps) {
  const map = useLayoutLookups().childClaims;

  return (
    <>
      {Object.keys(claims).map((id) => {
        const layout = layoutMap[id];
        if (!layout) {
          return null;
        }

        return (
          <GeneratorErrorBoundary key={id}>
            <GenerateComponent
              layout={layout}
              claim={claims[id]}
              childClaims={map[id]}
            />
          </GeneratorErrorBoundary>
        );
      })}
    </>
  );
}

function useIsHiddenPage(page: LayoutPage): boolean {
  const hiddenExpr = useHiddenLayoutsExpressions();
  return (
    useEvalExpressionInGenerator(hiddenExpr[page.pageKey], {
      returnType: ExprVal.Boolean,
      defaultValue: false,
      errorIntroText: `Invalid hidden expression for page ${page.pageKey}`,
    }) ?? false
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

  if (!GeneratorDebug.displayState) {
    return def.renderNodeGenerator(props);
  }

  return (
    <div
      style={{
        borderLeft: `5px solid blue`,
        paddingLeft: '5px',
      }}
    >
      <h3>
        {layout.id} ({layout.type})
      </h3>
      <span>{childClaims ? `Children: ${Object.keys(childClaims).join(', ')}` : 'No children'}</span>
      {def.renderNodeGenerator(props)}
    </div>
  );
}
