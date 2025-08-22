import React, { useContext, useMemo, useRef, useState } from 'react';
import type { BooleanExpression } from './types/Expression';
import { isExpressionValid } from './validators/isExpressionValid';
import { Tabs } from '@digdir/designsystemet-react';
import { SimplifiedEditor } from './SimplifiedEditor';
import { ManualEditor } from './ManualEditor';
import { isExpressionSimple } from './validators/isExpressionSimple';
import { StudioExpressionContext } from './StudioExpressionContext';
import type { DataLookupOptions } from './types/DataLookupOptions';
import classes from './StudioExpression.module.css';
import type { ExpressionTexts } from './types/ExpressionTexts';
import { StudioError } from '../StudioError';
import { SimpleSubexpressionValueType } from './enums/SimpleSubexpressionValueType';

export type StudioExpressionProps = {
  expression: BooleanExpression;
  types?: SimpleSubexpressionValueType[];
  onChange: (expression: BooleanExpression) => void;
  texts: ExpressionTexts;
  dataLookupOptions: Partial<DataLookupOptions>;
  showAddSubexpression?: boolean;
};

enum TabId {
  Simplified = 'simplified',
  Manual = 'manual',
}

export const StudioExpression = ({
  expression,
  types = Object.values(SimpleSubexpressionValueType),
  onChange,
  dataLookupOptions,
  texts,
  showAddSubexpression,
}: StudioExpressionProps) => {
  if (!isExpressionValid(expression)) {
    return <StudioError>{texts.invalidExpression}</StudioError>;
  }

  return (
    <StudioExpressionContext.Provider value={{ dataLookupOptions, texts, types }}>
      <ValidExpression
        expression={expression}
        onChange={onChange}
        showAddSubexpression={showAddSubexpression}
      />
    </StudioExpressionContext.Provider>
  );
};

type ValidExpressionProps = Pick<
  StudioExpressionProps,
  'expression' | 'onChange' | 'showAddSubexpression'
>;

const ValidExpression = ({ expression, showAddSubexpression, onChange }: ValidExpressionProps) => {
  const { texts } = useContext(StudioExpressionContext);
  const isSimplified = useMemo(() => isExpressionSimple(expression), [expression]);
  const initialTab = isSimplified ? TabId.Simplified : TabId.Manual;
  const [selectedTab, setSelectedTab] = useState<TabId>(initialTab);
  const isManualExpressionValidRef = useRef<boolean>(true);

  const handleChangeTab = (tab: TabId) => {
    if (!isManualExpressionValidRef.current) {
      if (confirm(texts.changeToSimplifiedWarning)) {
        isManualExpressionValidRef.current = true;
        setSelectedTab(tab);
      }
    } else {
      setSelectedTab(tab);
    }
  };

  return (
    <Tabs
      className={classes.validExpression}
      onChange={handleChangeTab}
      size='small'
      value={selectedTab}
    >
      <Tabs.List>
        <Tabs.Tab value={TabId.Simplified}>{texts.simplified}</Tabs.Tab>
        <Tabs.Tab value={TabId.Manual}>{texts.manual}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={TabId.Simplified} className={classes.tabContent}>
        <SimplifiedEditor
          expression={expression}
          onChange={onChange}
          showAddSubexpression={showAddSubexpression}
        />
      </Tabs.Content>
      <Tabs.Content value={TabId.Manual} className={classes.tabContent}>
        <ManualEditor
          expression={expression}
          onChange={onChange}
          isManualExpressionValidRef={isManualExpressionValidRef}
        />
      </Tabs.Content>
    </Tabs>
  );
};
