import React from 'react';

import { Paragraph } from '@digdir/designsystemet-react';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { useStore } from 'zustand';
import { findComponentById, getSimpleBinding, getTitleKey } from 'nextsrc/libs/form-engine/utils/findComponent';
import classes from 'nextsrc/libs/form-engine/components/Summary.module.css';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompSummaryExternal } from 'src/layout/Summary/config.generated';

export const Summary = ({ component }: ComponentProps) => {
  const props = component as CompSummaryExternal;
  const client = useFormClient();
  const { langAsString } = useLanguage();

  const targetComponent = findComponentById(client, props.componentRef);
  if (!targetComponent) {
    return <div>Summary: target component &quot;{props.componentRef}&quot; not found</div>;
  }

  const bindingPath = getSimpleBinding(targetComponent);
  const titleKey = getTitleKey(targetComponent);
  const title = titleKey ? langAsString(titleKey) : undefined;

  if (!bindingPath) {
    return (
      <div className={classes.border}>
        {title && <label>{title}</label>}
        <Paragraph asChild>
          <span>{langAsString('general.empty_summary')}</span>
        </Paragraph>
      </div>
    );
  }

  return <SummaryValue bindingPath={bindingPath} title={title} />;
};

function SummaryValue({ bindingPath, title }: { bindingPath: string; title?: string }) {
  const client = useFormClient();
  const value = useStore(client.formDataStore, (state) => state.getValue(bindingPath));
  const displayValue = value != null ? String(value) : '';

  return (
    <div className={classes.border}>
      {title && <label>{title}</label>}
      <Paragraph asChild>
        <span>{displayValue}</span>
      </Paragraph>
    </div>
  );
}
