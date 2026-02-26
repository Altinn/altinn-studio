import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { useStore } from 'zustand';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompSummary2External } from 'src/layout/Summary2/config.generated';

/**
 * Find a component by ID across all layouts in the client.
 */
function findComponentById(
  client: { getLayoutNames(): string[]; getFormLayout(name: string): { data: { layout: ResolvedCompExternal[] } } },
  targetId: string,
): ResolvedCompExternal | undefined {
  for (const layoutName of client.getLayoutNames()) {
    const layout = client.getFormLayout(layoutName);
    const found = findInComponents(layout.data.layout, targetId);
    if (found) {
      return found;
    }
  }
  return undefined;
}

function findInComponents(components: ResolvedCompExternal[], targetId: string): ResolvedCompExternal | undefined {
  for (const comp of components) {
    if (comp.id === targetId) {
      return comp;
    }
    if (comp.children) {
      const found = findInComponents(comp.children, targetId);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Extract the simpleBinding path from a component's dataModelBindings.
 */
function getSimpleBinding(component: ResolvedCompExternal): string | undefined {
  const bindings = (component as { dataModelBindings?: { simpleBinding?: string } }).dataModelBindings;
  if (!bindings?.simpleBinding) {
    return undefined;
  }
  return extractField(bindings.simpleBinding);
}

/**
 * Get the title text resource key from a component's textResourceBindings.
 */
function getTitleKey(component: ResolvedCompExternal): string | undefined {
  const trb = (component as { textResourceBindings?: { summaryTitle?: string; title?: string } }).textResourceBindings;
  return trb?.summaryTitle ?? trb?.title;
}

export const Summary2 = ({ component }: ComponentProps) => {
  const props = component as unknown as CompSummary2External;
  const client = useFormClient();
  const { langAsString } = useLanguage();

  const target = props.target;
  if (!target || target.type === 'layoutSet' || target.type === 'page') {
    return <div>Summary2: target type &quot;{target?.type ?? 'none'}&quot; not yet supported</div>;
  }

  const targetComponent = findComponentById(client, target.id);
  if (!targetComponent) {
    return <div>Summary2: target component &quot;{target.id}&quot; not found</div>;
  }

  const bindingPath = getSimpleBinding(targetComponent);
  const titleKey = getTitleKey(targetComponent);
  const title = titleKey ? langAsString(titleKey) : undefined;

  if (!bindingPath) {
    return (
      <div data-testid='summary-single-value-component'>
        <Paragraph asChild>
          <span>{langAsString('general.empty_summary')}</span>
        </Paragraph>
      </div>
    );
  }

  return (
    <SingleValueDisplay
      bindingPath={bindingPath}
      title={title}
      isCompact={props.isCompact}
    />
  );
};

function SingleValueDisplay({
  bindingPath,
  title,
  isCompact,
}: {
  bindingPath: string;
  title?: string;
  isCompact?: boolean;
}) {
  const client = useFormClient();
  const value = useStore(client.formDataStore, (state) => state.getValue(bindingPath));
  const displayValue = value != null ? String(value) : '';

  return (
    <div data-testid='summary-single-value-component'>
      {title && (
        <label>
          {title}
          {isCompact && ':'}
        </label>
      )}
      <Paragraph asChild>
        <span>{displayValue}</span>
      </Paragraph>
    </div>
  );
}
