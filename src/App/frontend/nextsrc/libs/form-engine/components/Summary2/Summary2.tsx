import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { useStore } from 'zustand';
import { findComponentById, getSimpleBinding, getTitleKey } from 'nextsrc/libs/form-engine/utils/findComponent';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompSummary2External } from 'src/layout/Summary2/config.generated';

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
