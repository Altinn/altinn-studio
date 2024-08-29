import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ExprVal } from 'src/features/expressions/types';
import { useHiddenLayoutsExpressions, useLayouts } from 'src/features/form/layout/LayoutsContext';
import { getComponentCapabilities, getComponentDef } from 'src/layout';
import { ContainerComponent } from 'src/layout/LayoutComponent';
import { GeneratorDebug } from 'src/utils/layout/generator/debug';
import { GeneratorInternal, GeneratorPageProvider } from 'src/utils/layout/generator/GeneratorContext';
import {
  GeneratorErrorBoundary,
  useGeneratorErrorBoundaryNodeRef,
} from 'src/utils/layout/generator/GeneratorErrorBoundary';
import {
  GeneratorCondition,
  GeneratorStages,
  NodesStateQueue,
  StageAddNodes,
} from 'src/utils/layout/generator/GeneratorStages';
import { useEvalExpressionInGenerator } from 'src/utils/layout/generator/useEvalExpression';
import { LayoutPage } from 'src/utils/layout/LayoutPage';
import { LayoutPages } from 'src/utils/layout/LayoutPages';
import { Hidden, NodesInternal, useNodesWhenNotReady } from 'src/utils/layout/NodesContext';
import type { CompExternal, CompExternalExact, CompTypes, ILayout } from 'src/layout/layout';
import type {
  BasicNodeGeneratorProps,
  ChildClaimerProps,
  ComponentProto,
  ContainerGeneratorProps,
} from 'src/layout/LayoutComponent';
import type { ChildClaim, ChildClaims, ChildClaimsMap } from 'src/utils/layout/generator/GeneratorContext';
import type { HiddenState } from 'src/utils/layout/NodesContext';

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

interface ChildrenState {
  forLayout: ILayout;
  map: ChildClaimsMap | undefined;
}

export function LayoutSetGenerator() {
  const layouts = useLayouts();
  const pages = useMemo(() => new LayoutPages(), []);

  const children = (
    <>
      <SaveFinishedNodesToStore pages={pages} />
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

  return GeneratorDebug.displayState ? <div style={style}>{children}</div> : children;
}

function SaveFinishedNodesToStore({ pages }: { pages: LayoutPages }) {
  const layouts = useLayouts();
  const existingNodes = useNodesWhenNotReady();
  const setNodes = NodesInternal.useSetNodes();
  const isFinished = GeneratorStages.useIsFinished();
  const layoutKeys = useMemo(() => Object.keys(layouts), [layouts]);

  useEffect(() => {
    if (existingNodes === pages) {
      return;
    }

    // With this being a useEffect, it will always run after all the children here have rendered - unless, importantly,
    // the children themselves rely on useEffect() to run in order to reach a stable state.
    const numPages = layoutKeys.length;
    if (!pages) {
      return;
    }
    if (numPages === 0) {
      setNodes(pages);
      return;
    }

    if (isFinished) {
      setNodes(pages);
    }
  }, [layoutKeys, pages, isFinished, setNodes, existingNodes]);

  return null;
}

function ExportStores() {
  const nodesStore = NodesInternal.useStore();

  useEffect(() => {
    window.CypressState = window.CypressState || {};
    window.CypressState.nodesStore = nodesStore;
  }, [nodesStore]);

  return null;
}

function useChildClaims(layout: ILayout, getProto: (id: string) => ComponentProto | undefined) {
  const mapRef = useRef<ChildClaimsMap>({});
  const [children, setChildren] = useState<ChildrenState>({ forLayout: layout, map: undefined });

  useEffect(() => {
    if (children.forLayout !== layout) {
      // Force a new first pass if the layout changes
      setChildren({ forLayout: layout, map: undefined });
      mapRef.current = {};
    }
    if (children.map === undefined) {
      // We always run this in a useEffect, so that even if nobody calls setChildren() via addClaim(), the
      // first pass still finishes. This is needed to support layouts without any child-bearing components.
      setChildren((prev) => ({ ...prev, map: prev.map ?? {} }));
    }
  }, [children, layout]);

  const getClaimedBy = useCallback((childId: string) => {
    if (mapRef.current === undefined) {
      return [];
    }

    const out: string[] = [];
    for (const parentId in mapRef.current) {
      if (mapRef.current[parentId]?.[childId]) {
        out.push(parentId);
      }
    }

    return out;
  }, []);

  const addClaim = useCallback(
    (parentId: string, childId: string, pluginKey: string, metadata: unknown) => {
      if (getProto(childId) === undefined) {
        window.logError(`Component '${childId}' (as referenced by '${parentId}') does not exist`);
        return;
      }
      const otherClaims = getClaimedBy(childId);
      if (otherClaims.length > 0) {
        const claimsStr = otherClaims.join(', ');
        window.logError(`Component '${childId}' (as referenced by '${parentId}') is already claimed by '${claimsStr}'`);
        return;
      }

      // We keep both the ref and the state in sync, so that getClaimedBy() can work immediately during a render (and not
      // have to wait for the next render to get the updated state).
      mapRef.current[parentId] = {
        ...mapRef.current[parentId],
        [childId]: { pluginKey, metadata },
      };
      setChildren((prev) => ({ ...prev, map: mapRef.current }));
    },
    [getProto, getClaimedBy],
  );

  return { map: children.map, addClaim };
}

interface PageProps {
  layout: ILayout;
  name: string;
  layoutSet: LayoutPages;
}

function PageGenerator({ layout, name, layoutSet }: PageProps) {
  const page = useMemo(() => new LayoutPage(), []);
  useGeneratorErrorBoundaryNodeRef().current = page;

  const getProto = useMemo(() => {
    const proto: { [id: string]: ComponentProto } = {};

    for (const component of layout) {
      proto[component.id] = {
        type: component.type,
        capabilities: getComponentCapabilities(component.type),
      };
    }

    return (id: string) => proto[id];
  }, [layout]);

  const claims = useChildClaims(layout, getProto);
  const map = claims.map;

  const topLevelIdsAsClaims = useMemo(() => {
    if (!map) {
      return {};
    }

    const claimedChildren = new Set(
      Object.values(map)
        .map((claims) => Object.keys(claims))
        .flat(),
    );
    const ids = layout.filter((component) => !claimedChildren.has(component.id)).map((component) => component.id);
    const claims: ChildClaims = {};
    for (const id of ids) {
      claims[id] = {};
    }
    return claims;
  }, [map, layout]);

  const layoutMap = useMemo(() => {
    const out: { [id: string]: CompExternal } = {};
    for (const component of layout) {
      out[component.id] = component;
    }

    return out;
  }, [layout]);

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
      <MarkPageHidden
        page={page}
        name={name}
      />
      {map === undefined &&
        layout.map((component) => (
          <ComponentClaimChildren
            key={component.id}
            component={component}
            claims={claims}
            getProto={getProto}
          />
        ))}
      {GeneratorDebug.displayState && <h2>Page: {name}</h2>}
      {map !== undefined && (
        <GeneratorPageProvider
          parent={page}
          layoutMap={layoutMap}
          childrenMap={map}
        >
          <GenerateNodeChildren
            claims={topLevelIdsAsClaims}
            pluginKey={undefined}
          />
        </GeneratorPageProvider>
      )}
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

  GeneratorStages.AddNodes.useEffect(() => {
    addPage(name);
    if (!page.isRegisteredInCollection(layoutSet)) {
      page.registerCollection(name, layoutSet);
    }
  }, [addPage, page, name, layoutSet]);

  return null;
}

function MarkPageHidden({ name, page }: Omit<CommonProps, 'layoutSet'>) {
  const setPageProp = NodesStateQueue.useSetPageProp();
  const hiddenByTracks = Hidden.useIsPageHiddenViaTracks(name);
  const hiddenByExpression = useIsHiddenPage(page);

  const hidden: HiddenState = useMemo(
    () => ({
      hiddenByTracks,
      hiddenByExpression,
      hiddenByRules: false,
    }),
    [hiddenByTracks, hiddenByExpression],
  );

  GeneratorStages.MarkHidden.useEffect(() => {
    setPageProp({ pageKey: name, prop: 'hidden', value: hidden });
  }, [hidden, name, setPageProp]);

  return null;
}

function useFilteredClaims(claims: ChildClaims, pluginKey: string | undefined) {
  return useMemo(() => {
    if (!pluginKey) {
      return claims;
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
  claims: ChildClaims;
  pluginKey: string | undefined;
}

export function GenerateNodeChildren({ claims, pluginKey }: NodeChildrenProps) {
  const layoutMap = GeneratorInternal.useLayoutMap();
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
  layoutMap: Record<string, CompExternal>;
}

function GenerateNodeChildrenInternal({ claims, layoutMap }: NodeChildrenInternalProps) {
  const map = GeneratorInternal.useChildrenMap();

  return (
    <>
      {Object.keys(claims).map((id) => (
        <GeneratorErrorBoundary key={id}>
          <GenerateComponent
            layout={layoutMap[id]}
            claim={claims[id]}
            childClaims={map[id]}
          />
        </GeneratorErrorBoundary>
      ))}
    </>
  );
}

function useIsHiddenPage(page: LayoutPage) {
  const hiddenExpr = useHiddenLayoutsExpressions();
  return useEvalExpressionInGenerator(ExprVal.Boolean, page, hiddenExpr[page.pageKey], false);
}

interface ComponentClaimChildrenProps {
  component: CompExternal;
  claims: ReturnType<typeof useChildClaims>;
  getProto: (id: string) => ComponentProto | undefined;
}

function ComponentClaimChildren({ component, claims, getProto }: ComponentClaimChildrenProps) {
  const def = getComponentDef(component.type);
  const { addClaim } = claims;

  // The first render will be used to determine which components will be claimed as children by others (which will
  // prevent them from rendering on the top-level on the next render pass). We must always set a state here,
  // otherwise the page will not know if the first pass is done.
  useEffect(() => {
    if (def instanceof ContainerComponent) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: ChildClaimerProps<any, unknown> = {
        item: component,
        claimChild: (pluginKey, childId, metadata) => {
          addClaim(component.id, childId, pluginKey, metadata);
        },
        getProto: (id) => {
          const proto = getProto(id);
          if (proto === undefined) {
            window.logError(`Component '${id}' (as referenced by '${component.id}') does not exist`);
          }
          return proto;
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      def.claimChildren(props as any);
    }
  }, [def, component, getProto, addClaim]);

  return (
    <>
      {GeneratorDebug.displayState && (
        <h3>
          {component.id} ({component.type})
        </h3>
      )}
      {GeneratorDebug.displayState && <span>(first pass render)</span>}
    </>
  );
}

interface ComponentProps {
  layout: CompExternalExact<CompTypes>;
  claim: ChildClaim;
  childClaims: ChildClaims | undefined;
}

function GenerateComponent({ layout, claim, childClaims }: ComponentProps) {
  const def = getComponentDef(layout.type);
  const props = useMemo(() => {
    if (def instanceof ContainerComponent) {
      const out: ContainerGeneratorProps = {
        claim,
        externalItem: layout,
        childClaims: childClaims ?? {},
      };
      return out;
    }

    const out: BasicNodeGeneratorProps = { claim, externalItem: layout };
    return out;
  }, [def, claim, layout, childClaims]);

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

  const Generator = def.renderNodeGenerator;

  if (!GeneratorDebug.displayState) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return <Generator {...(props as any)} />;
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
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Generator {...(props as any)} />
    </div>
  );
}
