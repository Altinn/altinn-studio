import React, { useCallback, useEffect } from 'react';

import { Checkbox, Fieldset, Select, Tabs } from '@digdir/design-system-react';
import cn from 'classnames';

import classes from 'src/features/devtools/components/ExpressionPlayground/ExpressionPlayground.module.css';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { DevToolsActions } from 'src/features/devtools/data/devToolsSlice';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { asExpression } from 'src/features/expressions/validation';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { useExprContext } from 'src/utils/layout/ExprContext';
import { selectDataSourcesFromState } from 'src/utils/layout/hierarchy';
import type { ExprConfig, Expression, ExprFunction } from 'src/features/expressions/types';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';
import type { LayoutPage } from 'src/utils/layout/LayoutPage';

interface ExpressionResult {
  value: string;
  isError: boolean;
}

function getTabKeyAndValue(i: number, output: ExpressionResult) {
  const key = `${i}-${output.value}`;
  const value = i === 0 ? `Gjeldende resultat` : `Tidligere (-${i})`;
  return { key, value };
}

export const ExpressionPlayground = () => {
  const input = useAppSelector((state) => state.devTools.exprPlayground.expression);
  const forPage = useAppSelector((state) => state.devTools.exprPlayground.forPage);
  const forComponentId = useAppSelector((state) => state.devTools.exprPlayground.forComponentId);
  const dispatch = useAppDispatch();

  const [showAllSteps, setShowAllSteps] = React.useState(false);
  const [activeOutputTab, setActiveOutputTab] = React.useState('Gjeldende resultat');
  const [outputs, setOutputs] = React.useState<ExpressionResult[]>([
    {
      value: '',
      isError: false,
    },
  ]);
  const nodes = useExprContext();
  const currentPage = nodes?.current()?.top.myKey;
  const dataSources = useAppSelector(selectDataSourcesFromState);

  const setOutputWithHistory = useCallback(
    (newValue: string, isError: boolean): boolean => {
      const lastOutput = outputs[0];
      if (!lastOutput || lastOutput.value === '') {
        setOutputs([{ value: newValue, isError }]);
        return true;
      }
      if (lastOutput.value === newValue && lastOutput.isError === isError) {
        return false;
      }
      const newOutputs = [{ value: newValue, isError }, ...outputs.filter((o) => (!isError ? !o.isError : true))];
      setOutputs(newOutputs.slice(0, 10));
      return true;
    },
    [outputs],
  );

  // This is OK if this function is called from places that immediately evaluates the expression again, thus
  // populating the output history with a fresh value.
  const resetOutputHistory = () => setOutputs([]);

  useEffect(() => {
    if (!input || input.length <= 0) {
      if (!outputs[0] || outputs[0]?.value !== '') {
        setOutputs([{ value: '', isError: false }]);
      }
      return;
    }

    try {
      let maybeExpression: string;
      try {
        maybeExpression = JSON.parse(input);
      } catch (e) {
        if (e instanceof Error) {
          throw new Error(`Ugyldig JSON: ${e.message}`);
        } else {
          throw new Error('Ugyldig JSON');
        }
      }
      const config: ExprConfig<ExprVal.Any> = {
        returnType: ExprVal.Any,
        defaultValue: null,
        resolvePerRow: false,
        errorAsException: true,
      };

      const expr = asExpression(maybeExpression, config);
      if (!expr) {
        throw new Error('Ugyldig uttrykk');
      }

      let evalContext: LayoutPage | LayoutNode | undefined = nodes?.current();
      if (!evalContext) {
        throw new Error('Fant ikke nåværende side/layout');
      }

      if (forPage && forComponentId) {
        const foundNode = nodes?.findLayout(forPage)?.findById(forComponentId);
        if (foundNode) {
          evalContext = foundNode;
        }
      }

      const calls: string[] = [];
      const onAfterFunctionCall = (path: string[], func: ExprFunction, args: any[], result: any) => {
        const indent = '  '.repeat(path.length);
        calls.push(`${indent}${JSON.stringify([func, ...args])} => ${JSON.stringify(result)}`);
      };

      const out = evalExpr(expr as Expression, evalContext, dataSources, { config, onAfterFunctionCall });

      if (showAllSteps) {
        setOutputWithHistory(calls.join('\n'), false);
      } else {
        setOutputWithHistory(JSON.stringify(out), false);
      }
    } catch (e) {
      if (!outputs[0] || outputs[0]?.value !== e.message) {
        setOutputs([{ value: e.message, isError: true }]);
      }
    }
  }, [input, forPage, forComponentId, dataSources, nodes, showAllSteps, outputs, setOutputWithHistory]);

  return (
    <div className={classes.container}>
      <SplitView
        direction={'row'}
        sizes={[300]}
      >
        <SplitView direction='column'>
          <textarea
            className={cn(classes.textbox, classes.input)}
            value={input}
            onChange={(e) => dispatch(DevToolsActions.exprPlaygroundSetExpression({ expression: e.target.value }))}
            placeholder={'Skriv inn et dynamisk uttrykk...\nEksempel: ["equals", ["component", "firstName"], "Ola"]'}
          />
          {outputs.length === 1 && (
            <textarea
              style={{ color: outputs[0].isError ? 'red' : 'black' }}
              className={cn(classes.textbox, classes.output)}
              readOnly={true}
              value={outputs[0].value}
              placeholder={'Resultatet av uttrykket vises her'}
            />
          )}
          {outputs.length > 1 && (
            <div className={classes.outputs}>
              <Tabs
                size='small'
                value={activeOutputTab}
                onChange={(outputName) => {
                  setActiveOutputTab(outputName);
                }}
              >
                <Tabs.List className={classes.tablist}>
                  {outputs.map((output, i) => {
                    const { key, value } = getTabKeyAndValue(i, output);
                    return (
                      <Tabs.Tab
                        value={value}
                        key={key}
                      >
                        {value}
                      </Tabs.Tab>
                    );
                  })}
                </Tabs.List>
                {outputs.map((output, i) => {
                  const { key, value } = getTabKeyAndValue(i, output);
                  return (
                    <Tabs.Content
                      value={value}
                      key={key}
                    >
                      <textarea
                        style={{ color: output.isError ? 'red' : 'black' }}
                        className={cn(classes.textbox, classes.output)}
                        readOnly={true}
                        value={output.value}
                        placeholder={'Resultatet av uttrykket vises her'}
                      />
                    </Tabs.Content>
                  );
                })}
              </Tabs>
            </div>
          )}
        </SplitView>
        <div className={classes.rightColumn}>
          <Fieldset legend={'Kjør uttrykk i kontekst av komponent'}>
            <Select
              value={`${forPage}|${forComponentId}`}
              onChange={(value) => {
                const [forPage, forComponentId] = value.split('|', 2);
                dispatch(DevToolsActions.exprPlaygroundSetContext({ forPage, forComponentId }));
              }}
              options={Object.values(nodes?.all() || [])
                .map((page) => page.flat(true))
                .flat()
                .map((n) => ({ label: n.item.id, value: `${n.top.top.myKey}|${n.item.id}` }))}
            />
            {forComponentId && forPage === currentPage && (
              // eslint-disable-next-line jsx-a11y/anchor-is-valid
              <a
                href={'#'}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch(DevToolsActions.nodeInspectorSet({ selectedNodeId: forComponentId }));
                  dispatch(DevToolsActions.setActiveTab({ tabName: DevToolsTab.Components }));
                }}
              >
                Vis i komponent-utforskeren
              </a>
            )}
            {forComponentId && forPage !== currentPage && (
              <span>
                Komponenten vises på siden <em>{forPage}</em>
              </span>
            )}
            <div style={{ paddingTop: 10 }}>
              <Checkbox
                checked={showAllSteps}
                onChange={(ev) => {
                  resetOutputHistory();
                  setShowAllSteps(ev.target.checked);
                }}
                value='nothing'
              >
                Vis alle steg i evalueringen
              </Checkbox>
            </div>
          </Fieldset>
          <br />
          <br />
          <Fieldset legend={'Dokumentasjon'}>
            Les mer om uttrykk{' '}
            <a
              href={'https://docs.altinn.studio/nb/app/development/logic/expressions/'}
              target={'_blank'}
              rel='noreferrer'
            >
              i dokumentasjonen
            </a>
          </Fieldset>
        </div>
      </SplitView>
    </div>
  );
};
