import React from 'react';
import type { JSX, PropsWithChildren } from 'react';

import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { getComponentDef } from 'src/layout';
import { CompCategory } from 'src/layout/common';
import { useHasOnlyEmptyChildren, useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import classes from 'src/layout/Summary2/Summary2.module.css';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useExternalItem } from 'src/utils/layout/hooks';
import { Hidden } from 'src/utils/layout/NodesContext';
import { useItemFor, useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { CompTypes } from 'src/layout/layout';

interface ComponentSummaryProps {
  targetBaseComponentId: string;
}

export enum SummaryContains {
  // This represents an empty value for a field that is not required. Only use this content type if your component can
  // also display some content. If it is impossible for the component to display some 'content', it is most likely
  // presentational.
  EmptyValueNotRequired = 'emptyNotRequired',

  // This also represents an empty value, but one where some content is required.
  EmptyValueRequired = 'emptyValueRequired',

  // This is the content type used when your component has some kind of content to summarize. Usually it must also
  // be possible for that content to be empty, so you should toggle between these two states.
  SomeUserContent = 'notEmpty',

  // If your component is presentational (i.e. paragraphs, headers), it will be counted when considering if empty
  // components should be hidden but it will only be hidden from the summary if there are 1+ form components (i.e.
  // components that report either emptyValue or SomeUserContent) within the same EmptyChildrenBoundary, and all of them
  // are empty. This means that if you have a group that only contains presentational components, that group will never
  // be hidden. But a Header alongside a set of Input components will be hidden if all the Input components are empty.
  Presentational = 'presentational',
}

export function ComponentSummary({ targetBaseComponentId }: ComponentSummaryProps) {
  const type = useExternalItem(targetBaseComponentId).type;
  const def = getComponentDef(type);
  return def.renderSummary2 ? def.renderSummary2({ targetBaseComponentId }) : null;
}

export function useSummarySoftHidden(hidden: boolean | undefined) {
  const hiddenOverride = useDevToolsStore((state) => state.isOpen && state.hiddenComponents);
  return {
    // This is the class name you should use to soft-hide container components
    className: hidden ? (hiddenOverride === 'disabled' ? classes.greyedOut : classes.hidden) : classes.visible,

    // If this is true, you should instead just show the component as normal (but remember to use the correct className)
    forceShow: hiddenOverride === 'show' || hiddenOverride === 'disabled',

    // Leaf components (like singular values) can return null early if this is true. They must still register
    // their emptiness-state with useReportSummaryRender().
    leafCanReturnNull: hiddenOverride === false || hiddenOverride === 'hide',
  };
}

function useIsHidden(baseComponentId: string) {
  const hiddenInOverride = useSummaryOverrides(baseComponentId)?.hidden;

  // We say that we're not respecting DevTools here, but that's just because Summary2 implements that support
  // on its own, by also supporting 'greying out' hidden components from Summary2.
  const hidden = Hidden.useIsHidden(useIndexedId(baseComponentId), 'node', { respectDevTools: false });

  return !!(hidden || hiddenInOverride);
}

function useIsHiddenBecauseEmpty<T extends CompTypes>(baseComponentId: string, type: T, content: SummaryContains) {
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  const item = useItemWhenType(baseComponentId, type);
  const isRequired = 'required' in item ? item.required : undefined;
  const forceShowInSummary = item['forceShowInSummary'];

  if (isRequired && content === SummaryContains.EmptyValueNotRequired) {
    window.logErrorOnce(`Node ${baseComponentId} marked as required, but summary indicates EmptyValueNotRequired`);
  } else if (isRequired === false && content === SummaryContains.EmptyValueRequired) {
    window.logErrorOnce(`Node ${baseComponentId} marked as not required, but summary indicates EmptyValueRequired`);
  }

  return hideEmptyFields && !forceShowInSummary && content === SummaryContains.EmptyValueNotRequired;
}

interface SummaryFlexProps extends PropsWithChildren {
  targetBaseId: string;
  content: SummaryContains;
  className?: string;
}

function SummaryFlexInternal({ targetBaseId, children, className }: Omit<SummaryFlexProps, 'content'>) {
  const { pageBreak, grid, type } = useItemFor(targetBaseId);
  const indexedId = useIndexedId(targetBaseId);

  return (
    <Flex
      item
      className={cn(pageBreakStyles(pageBreak), classes.summaryItem, className)}
      size={grid}
      data-summary-target={indexedId}
      data-summary-target-type={type}
    >
      {children}
    </Flex>
  );
}

/**
 * The SummaryFlex component (or variants of it) should always be the first rendered component returned when a
 * layout-component renders Summary2. This will add the proper Flex component, and will properly handle the 'empty'
 * functionality that makes the 'hideEmptyFields' functionality work. If a component is a container that wraps other
 * layout-components it should consider using one of these instead:
 *
 * @see SummaryFlexForContainer
 * @see HideWhenAllChildrenEmpty
 */
export function SummaryFlex({ targetBaseId, className, content, children }: SummaryFlexProps) {
  const component = useExternalItem(targetBaseId);
  const def = getComponentDef(component.type);
  const empty = content === SummaryContains.EmptyValueNotRequired || content === SummaryContains.EmptyValueRequired;
  if (def.category === CompCategory.Container && !empty) {
    throw new Error(
      `SummaryFlex rendered with ${component.type} target. Use SummaryFlexForContainer or HideWhenAllChildrenEmpty instead.`,
    );
  }

  const isHidden = useIsHidden(targetBaseId);
  const isHiddenBecauseEmpty = useIsHiddenBecauseEmpty(targetBaseId, component.type, content);
  const { className: hiddenClass, leafCanReturnNull } = useSummarySoftHidden(isHidden);

  useReportSummaryRender(isHidden ? SummaryContains.EmptyValueNotRequired : content);

  if ((isHidden || isHiddenBecauseEmpty) && leafCanReturnNull) {
    return null;
  }

  return (
    <SummaryFlexInternal
      targetBaseId={targetBaseId}
      className={cn(className, hiddenClass)}
    >
      {children}
    </SummaryFlexInternal>
  );
}

interface HideWhenAllChildrenEmptyProps {
  hideWhen: boolean | undefined;
}

/**
 * This is an alternative to SummaryFlex, for use in container components. It register itself as empty and hide itself
 * when `hideWhen` is true and all children are registered as empty.
 * @see HideWhenAllChildrenEmpty
 */
export function SummaryFlexForContainer({
  hideWhen,
  targetBaseId,
  children,
}: HideWhenAllChildrenEmptyProps & Pick<SummaryFlexProps, 'targetBaseId' | 'children'>) {
  const component = useExternalItem(targetBaseId);
  const def = getComponentDef(component.type);
  if (def.category !== CompCategory.Container) {
    throw new Error(`SummaryFlexForContainer rendered with ${component.type} target. Use SummaryFlex instead.`);
  }

  const isHidden = useIsHidden(targetBaseId);
  const hasOnlyEmptyChildren = useHasOnlyEmptyChildren();
  const { className, forceShow } = useSummarySoftHidden(hasOnlyEmptyChildren && hideWhen === true);

  if (isHidden && !forceShow) {
    return null;
  }

  // We still have to render out the actual children when we only have empty children, otherwise the unmount effect
  // would just decrement the number of empty components and we'd bounce back to the initial state. Without this, and
  // the unmount effect, the children could never report changes and go from being empty to not being empty anymore.
  return (
    <SummaryFlexInternal
      targetBaseId={targetBaseId}
      className={className}
    >
      {children}
    </SummaryFlexInternal>
  );
}

interface ExtraRenderProp {
  render: (className: string, isEmpty: boolean) => JSX.Element;
}

/**
 * This is useful when you want to hide something when all children are empty, but you don't want a SummaryFlex
 * component to be rendered as well. This lets you place a EmptyChildrenBoundary in the middle of your layout-component,
 * for example to conditionally show a row in Grid only if any of the child-components are non-empty.
 * @see EmptyChildrenBoundary
 */
export function HideWhenAllChildrenEmpty({ hideWhen, render }: HideWhenAllChildrenEmptyProps & ExtraRenderProp) {
  const hasOnlyEmptyChildren = useHasOnlyEmptyChildren();
  const { className } = useSummarySoftHidden(hasOnlyEmptyChildren && hideWhen === true);
  return render(className, hasOnlyEmptyChildren);
}
