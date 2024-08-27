import React, { useCallback, useEffect } from 'react';

import { Checkbox, Combobox, Fieldset, Tabs } from '@digdir/designsystemet-react';
import cn from 'classnames';

import classes from 'src/features/devtools/components/ExpressionPlayground/ExpressionPlayground.module.css';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { useDevToolsStore } from 'src/features/devtools/data/DevToolsStore';
import { DevToolsTab } from 'src/features/devtools/data/types';
import { evalExpr } from 'src/features/expressions';
import { ExprVal } from 'src/features/expressions/types';
import { ExprValidation } from 'src/features/expressions/validation';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import comboboxClasses from 'src/styles/combobox.module.css';
import { useNodes } from 'src/utils/layout/NodesContext';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import { useNodeTraversal, useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
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
  const input = useDevToolsStore((state) => state.exprPlayground.expression);
  const forPage = useDevToolsStore((state) => state.exprPlayground.forPage);
  const forComponentId = useDevToolsStore((state) => state.exprPlayground.forComponentId);
  const setExpression = useDevToolsStore((state) => state.actions.exprPlaygroundSetExpression);
  const setContext = useDevToolsStore((state) => state.actions.exprPlaygroundSetContext);
  const setActiveTab = useDevToolsStore((state) => state.actions.setActiveTab);
  const nodeInspectorSet = useDevToolsStore((state) => state.actions.nodeInspectorSet);

  const [showAllSteps, setShowAllSteps] = React.useState(false);
  const [activeOutputTab, setActiveOutputTab] = React.useState('Gjeldende resultat');
  const [outputs, setOutputs] = React.useState<ExpressionResult[]>([
    {
      value: '',
      isError: false,
    },
  ]);
  const nodes = useNodes();
  const currentPageId = useNavigationParam('pageKey');

  const selectedContext = forPage && forComponentId ? [`${forPage}|${forComponentId}`] : [];
  const dataSources = useExpressionDataSources();

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

  const traversalSelector = useNodeTraversalSelector();

  const componentOptions = useNodeTraversal((t) =>
    t.allNodes().map((n) => ({ label: n.id, value: `${n.page.pageKey}|${n.id}` })),
  );

  useEffect(() => {
    if (!input || input.length <= 0) {
      if (!outputs[0] || outputs[0]?.value !== '') {
        setOutputs([{ value: '', isError: false }]);
      }
      return;
    }

    try {
      let maybeExpression: unknown;
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
      };

      ExprValidation.throwIfInvalid(maybeExpression);

      let evalContext: LayoutPage | LayoutNode | undefined = traversalSelector(
        (t) => t.findPage(currentPageId),
        [currentPageId],
      );
      if (!evalContext) {
        throw new Error('Fant ikke nåværende side/layout');
      }

      if (forPage && forComponentId) {
        const foundNode = traversalSelector(
          (t) => {
            const page = t.findPage(forPage);
            return page
              ? t.with(page).children((i) => i.type === 'node' && i.item?.id === forComponentId)[0]
              : undefined;
          },
          [forPage, forComponentId],
        );
        if (foundNode) {
          evalContext = foundNode;
        }
      }

      const calls: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onAfterFunctionCall = (path: string[], func: ExprFunction, args: any[], result: any) => {
        const indent = '  '.repeat(path.length);
        calls.push(`${indent}${JSON.stringify([func, ...args])} => ${JSON.stringify(result)}`);
      };

      const out = evalExpr(maybeExpression as Expression, evalContext, dataSources, { config, onAfterFunctionCall });

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
  }, [
    input,
    forPage,
    forComponentId,
    dataSources,
    nodes,
    showAllSteps,
    outputs,
    setOutputWithHistory,
    currentPageId,
    traversalSelector,
  ]);

  return (
    <div className={classes.container}>
      <SplitView
        direction={'row'}
        sizes={[300]}
      >
        <SplitView direction='column'>
          <textarea
            className={classes.textbox}
            value={input}
            onChange={(e) => setExpression(e.target.value)}
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
                <Tabs.List>
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
            <Combobox
              size='sm'
              value={selectedContext}
              onValueChange={(values) => {
                const selected = values.at(0);
                if (selected) {
                  const [forPage, forComponentId] = selected.split('|', 2);
                  setContext(forPage, forComponentId);
                }
              }}
              className={comboboxClasses.container}
            >
              {componentOptions.map(({ value, label }) => (
                <Combobox.Option
                  key={value}
                  value={value}
                  displayValue={label}
                >
                  {label}
                </Combobox.Option>
              ))}
            </Combobox>
            {forComponentId && forPage === currentPageId && (
              // eslint-disable-next-line jsx-a11y/anchor-is-valid
              <a
                href={'#'}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(DevToolsTab.Components);
                  nodeInspectorSet(forComponentId);
                }}
              >
                Vis i komponent-utforskeren
              </a>
            )}
            {forComponentId && forPage !== currentPageId && (
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
