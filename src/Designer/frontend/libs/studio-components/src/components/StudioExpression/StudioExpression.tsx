import React, { useMemo, useState } from 'react';
import type { BooleanExpression } from './types/Expression';
import { isExpressionValid } from './validators/isExpressionValid';
import { Tabs } from '@digdir/designsystemet-react';
import { SimplifiedEditor } from './SimplifiedEditor';
import { StudioManualExpression } from '../StudioManualExpression';
import { isExpressionSimple } from './validators/isExpressionSimple';
import {
  StudioExpressionContextProvider,
  useStudioExpressionContext,
} from './StudioExpressionContext';
import type { DataLookupOptions } from './types/DataLookupOptions';
import classes from './StudioExpression.module.css';
import type { ExpressionTexts } from './types/ExpressionTexts';
import { StudioError } from '../StudioError';
import { SimpleSubexpressionValueType } from './enums/SimpleSubexpressionValueType';
import { DataLookupFuncName } from './enums/DataLookupFuncName';

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
  dataLookupOptions: partialDataLookupOptions,
  texts,
  showAddSubexpression,
}: StudioExpressionProps): React.ReactElement => {
  const dataLookupOptions: DataLookupOptions = useMemo<DataLookupOptions>(
    () => ({
      [DataLookupFuncName.Component]: [],
      [DataLookupFuncName.DataModel]: [],
      ...partialDataLookupOptions,
    }),
    [partialDataLookupOptions],
  );

  if (!isExpressionValid(expression)) {
    return <StudioError>{texts.invalidExpression}</StudioError>;
  }

  return (
    <StudioExpressionContextProvider value={{ dataLookupOptions, texts, types }}>
      <ValidExpression
        expression={expression}
        onChange={onChange}
        showAddSubexpression={showAddSubexpression}
      />
    </StudioExpressionContextProvider>
  );
};

type ValidExpressionProps = Pick<
  StudioExpressionProps,
  'expression' | 'onChange' | 'showAddSubexpression'
>;

const ValidExpression = ({
  expression,
  showAddSubexpression,
  onChange,
}: ValidExpressionProps): React.ReactElement => {
  const { texts } = useStudioExpressionContext();
  const isSimplified = useMemo(() => isExpressionSimple(expression), [expression]);
  const initialTab = isSimplified ? TabId.Simplified : TabId.Manual;
  const [selectedTab, setSelectedTab] = useState<TabId>(initialTab);
  const [isValid, setIsValid] = useState<boolean>(true);

  const handleChangeTab = (tab: TabId): void => {
    if (!isValid) {
      if (confirm(texts.changeToSimplifiedWarning)) {
        setIsValid(true);
        setSelectedTab(tab);
      }
    } else {
      setSelectedTab(tab);
    }
  };

  return (
    <Tabs className={classes.validExpression} onChange={handleChangeTab} value={selectedTab}>
      <Tabs.List>
        <Tabs.Tab value={TabId.Simplified}>{texts.simplified}</Tabs.Tab>
        <Tabs.Tab value={TabId.Manual}>{texts.manual}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value={TabId.Simplified} className={classes.tabContent}>
        <SimplifiedEditor
          expression={expression}
          onChange={onChange}
          showAddSubexpression={showAddSubexpression}
        />
      </Tabs.Panel>
      <Tabs.Panel value={TabId.Manual} className={classes.tabContent}>
        <StudioManualExpression
          expression={expression}
          onValidExpressionChange={onChange}
          onValidityChange={setIsValid}
          texts={texts}
        />
      </Tabs.Panel>
    </Tabs>
  );
};
