import React, { useMemo, useState } from 'react';
import type { BooleanExpression } from './types/Expression';
import { isExpressionValid } from './validators/isExpressionValid';
import { StudioTabs } from '../StudioTabs';
import { SimplifiedEditor } from './SimplifiedEditor';
import { StudioManualExpression } from '../StudioManualExpression';
import { expressionToString } from '../StudioManualExpression/converters';
import { StudioFormActions } from '../StudioFormActions';
import { isExpressionSimple } from './validators/isExpressionSimple';
import {
  StudioExpressionContextProvider,
  useStudioExpressionContext,
} from './StudioExpressionContext';
import type { DataLookupOptions } from './types/DataLookupOptions';
import type { ExpressionTexts } from './types/ExpressionTexts';
import { StudioError } from '../StudioError';
import { SimpleSubexpressionValueType } from './enums/SimpleSubexpressionValueType';
import { DataLookupFuncName } from './enums/DataLookupFuncName';
import classes from './StudioExpression.module.css';

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
  const [draftExpression, setDraftExpression] = useState<BooleanExpression | undefined>(undefined);
  const [manualEditorKey, setManualEditorKey] = useState<number>(0);

  const hasUnsavedChanges =
    !isValid ||
    (draftExpression !== undefined &&
      expressionToString(draftExpression) !== expressionToString(expression));

  const resetDraft = (): void => {
    setDraftExpression(undefined);
    setIsValid(true);
  };

  const handleChangeTab = (tab: TabId): void => {
    if (!hasUnsavedChanges || confirm(texts.changeToSimplifiedWarning)) {
      resetDraft();
      setSelectedTab(tab);
    }
  };

  const handleSave = (): void => {
    onChange(draftExpression);
    setDraftExpression(undefined);
  };

  const handleDiscard = (): void => {
    resetDraft();
    setManualEditorKey((key) => key + 1);
  };

  return (
    <StudioTabs onChange={handleChangeTab} value={selectedTab}>
      <StudioTabs.List>
        <StudioTabs.Tab value={TabId.Simplified}>{texts.simplified}</StudioTabs.Tab>
        <StudioTabs.Tab value={TabId.Manual}>{texts.manual}</StudioTabs.Tab>
      </StudioTabs.List>
      <StudioTabs.Panel value={TabId.Simplified}>
        <SimplifiedEditor
          expression={expression}
          onChange={onChange}
          showAddSubexpression={showAddSubexpression}
        />
      </StudioTabs.Panel>
      <StudioTabs.Panel value={TabId.Manual}>
        {selectedTab === TabId.Manual && (
          <>
            <StudioManualExpression
              key={`${manualEditorKey}-${expressionToString(expression)}`}
              expression={expression}
              onValidExpressionChange={setDraftExpression}
              onValidityChange={setIsValid}
              texts={texts}
            />
            <StudioFormActions
              className={classes.formActions}
              primary={{
                label: texts.save,
                onClick: handleSave,
                disabled: !isValid || !hasUnsavedChanges,
              }}
              secondary={{
                label: texts.discard,
                onClick: handleDiscard,
                disabled: !hasUnsavedChanges,
              }}
              isLoading={false}
            />
          </>
        )}
      </StudioTabs.Panel>
    </StudioTabs>
  );
};
