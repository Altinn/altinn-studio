import React from 'react';
import type { JSX, PropsWithChildren } from 'react';

import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { CompCategory } from 'src/layout/common';
import { useHasOnlyEmptyChildren, useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import classes from 'src/layout/Summary2/Summary2.module.css';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { pageBreakStyles } from 'src/utils/formComponentUtils';
import { Hidden, useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { CompTypes } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface ComponentSummaryProps<T extends CompTypes = CompTypes> {
  target: LayoutNode<T>;
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

export function ComponentSummaryById({ componentId }: { componentId: string }) {
  const target = useNode(componentId);
  if (!target) {
    return null;
  }

  return <ComponentSummary target={target} />;
}

export function ComponentSummary<T extends CompTypes>({ target }: ComponentSummaryProps<T>) {
  const def = target.def;
  return def.renderSummary2 ? def.renderSummary2({ target: target as never }) : null;
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

function useIsHidden<T extends CompTypes>(node: LayoutNode<T>) {
  const hiddenInOverride = useSummaryOverrides(node)?.hidden;

  // We say that we're not respecting DevTools here, but that's just because Summary2 implements that support
  // on its own, by also supporting 'greying out' hidden components from Summary2.
  const hidden = Hidden.useIsHidden(node, { respectDevTools: false });

  return !!(hidden || hiddenInOverride);
}

function useIsHiddenBecauseEmpty<T extends CompTypes>(node: LayoutNode<T>, content: SummaryContains) {
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  const isRequired = useNodeItem(node, (i) => ('required' in i ? i.required : undefined));
  const forceShowInSummary = useNodeItem(node, (i) => i['forceShowInSummary']);

  if (isRequired && content === SummaryContains.EmptyValueNotRequired) {
    window.logErrorOnce(`Node ${node.id} marked as required, but summary indicates EmptyValueNotRequired`);
  } else if (isRequired === false && content === SummaryContains.EmptyValueRequired) {
    window.logErrorOnce(`Node ${node.id} marked as not required, but summary indicates EmptyValueRequired`);
  }

  return hideEmptyFields && !forceShowInSummary && content === SummaryContains.EmptyValueNotRequired;
}

interface SummaryFlexProps extends PropsWithChildren {
  target: LayoutNode;
  content: SummaryContains;
  className?: string;
}

function SummaryFlexInternal({ target, children, className }: Omit<SummaryFlexProps, 'content'>) {
  const pageBreak = useNodeItem(target, (i) => i.pageBreak);
  const grid = useNodeItem(target, (i) => i.grid);

  return (
    <Flex
      item
      className={cn(pageBreakStyles(pageBreak), classes.summaryItem, className)}
      size={grid}
      data-summary-target={target.id}
      data-summary-target-type={target.type}
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
export function SummaryFlex({ target, className, content, children }: SummaryFlexProps) {
  const empty = content === SummaryContains.EmptyValueNotRequired || content === SummaryContains.EmptyValueRequired;
  if (target.def.category === CompCategory.Container && !empty) {
    throw new Error(
      `SummaryFlex rendered with ${target.type} target. Use SummaryFlexForContainer or HideWhenAllChildrenEmpty instead.`,
    );
  }

  const isHidden = useIsHidden(target);
  const isHiddenBecauseEmpty = useIsHiddenBecauseEmpty(target, content);
  const { className: hiddenClass, leafCanReturnNull } = useSummarySoftHidden(isHidden);

  useReportSummaryRender(isHidden ? SummaryContains.EmptyValueNotRequired : content);

  if ((isHidden || isHiddenBecauseEmpty) && leafCanReturnNull) {
    return null;
  }

  return (
    <SummaryFlexInternal
      target={target}
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
  target,
  children,
}: HideWhenAllChildrenEmptyProps & Pick<SummaryFlexProps, 'target' | 'children'>) {
  if (target.def.category !== CompCategory.Container) {
    throw new Error(`SummaryFlexForContainer rendered with ${target.type} target. Use SummaryFlex instead.`);
  }

  const isHidden = useIsHidden(target);
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
      target={target}
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
