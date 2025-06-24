import React, { useEffect, useMemo, useState } from 'react';

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
import { DataModelLocationProviderFromNode } from 'src/utils/layout/DataModelLocation';
import { NodesInternal, useNode } from 'src/utils/layout/NodesContext';
import { useExpressionDataSources } from 'src/utils/layout/useExpressionDataSources';
import type { Expression, ExprFunctionName } from 'src/features/expressions/types';

interface ExpressionResult {
  value: string;
  isError: boolean;
}

function getTabKeyAndValue(i: number, output: ExpressionResult) {
  const key = `${i}-${output.value}`;
  const value = i === 0 ? `Gjeldende resultat` : `Tidligere (-${i})`;
  return { key, value };
}

function usePlaygroundState() {
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState('Gjeldende resultat');
  const [outputs, setOutputs] = useState<ExpressionResult[]>([
    {
      value: '',
      isError: false,
    },
  ]);

  return { showAllSteps, setShowAllSteps, activeOutputTab, setActiveOutputTab, outputs, setOutputs };
}

export const ExpressionPlayground = () => {
  const input = useDevToolsStore((state) => state.exprPlayground.expression);
  const nodeId = useDevToolsStore((state) => state.exprPlayground.nodeId);
  const setExpression = useDevToolsStore((state) => state.actions.exprPlaygroundSetExpression);
  const setContext = useDevToolsStore((state) => state.actions.exprPlaygroundSetContext);
  const setActiveTab = useDevToolsStore((state) => state.actions.setActiveTab);
  const nodeInspectorSet = useDevToolsStore((state) => state.actions.nodeInspectorSet);
  const currentPageId = useNavigationParam('pageKey');
  const node = useNode(nodeId);
  const nodePage = node?.page.pageKey;

  const { showAllSteps, setShowAllSteps, activeOutputTab, setActiveOutputTab, outputs, setOutputs } =
    usePlaygroundState();
  const selectedContext = nodeId ? [nodeId] : [];

  // This is OK if this function is called from places that immediately evaluates the expression again, thus
  // populating the output history with a fresh value.
  const resetOutputHistory = () => setOutputs([]);

  const componentOptions = NodesInternal.useMemoSelector((state) =>
    Object.values(state.nodeData).map((nodeData) => ({
      label: nodeData.layout.id,
      value: nodeData.layout.id,
    })),
  );

  return (
    <div className={classes.container}>
      <SplitView
        direction='row'
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
              placeholder='Resultatet av uttrykket vises her'
            />
          )}
          {outputs.length > 1 && (
            <div className={classes.outputs}>
              <Tabs
                data-size='sm'
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
                    <Tabs.Panel
                      value={value}
                      key={key}
                    >
                      <textarea
                        style={{ color: output.isError ? 'red' : 'black' }}
                        className={cn(classes.textbox, classes.output)}
                        readOnly={true}
                        value={output.value}
                        placeholder='Resultatet av uttrykket vises her'
                      />
                    </Tabs.Panel>
                  );
                })}
              </Tabs>
            </div>
          )}
        </SplitView>
        <div className={classes.rightColumn}>
          <Fieldset>
            <Fieldset.Legend>Kjør uttrykk i kontekst av komponent</Fieldset.Legend>
            <Combobox
              size='sm'
              value={selectedContext}
              onValueChange={(values) => {
                const selected = values.at(0);
                if (selected) {
                  setContext(selected);
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
            {nodeId && nodePage === currentPageId && (
              // eslint-disable-next-line jsx-a11y/anchor-is-valid
              <a
                href='#'
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(DevToolsTab.Components);
                  nodeInspectorSet(nodeId);
                }}
              >
                Vis i komponent-utforskeren
              </a>
            )}
            {nodeId && nodePage !== currentPageId && (
              <span>
                Komponenten vises på siden <em>{nodePage}</em>
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
                label='Vis alle steg i evalueringen'
              />
            </div>
          </Fieldset>
          <br />
          <br />
          <Fieldset>
            <Fieldset.Legend>Dokumentasjon</Fieldset.Legend>
            Les mer om uttrykk{' '}
            <a
              href='https://docs.altinn.studio/nb/altinn-studio/reference/logic/expressions/'
              target='_blank'
              rel='noreferrer'
            >
              i dokumentasjonen
            </a>
          </Fieldset>
        </div>
      </SplitView>
      <ExpressionRunnerWrapper
        key={input}
        outputs={outputs}
        setOutputs={setOutputs}
        showAllSteps={showAllSteps}
      />
    </div>
  );
};

type RunnerProps = Pick<ReturnType<typeof usePlaygroundState>, 'outputs' | 'setOutputs' | 'showAllSteps'>;

function ExpressionRunnerWrapper(props: RunnerProps) {
  const nodeId = useDevToolsStore((state) => state.exprPlayground.nodeId);

  if (nodeId) {
    return (
      <DataModelLocationProviderFromNode nodeId={nodeId}>
        <ExpressionRunner {...props} />
      </DataModelLocationProviderFromNode>
    );
  }

  return <ExpressionRunner {...props} />;
}

function ExpressionRunner({ outputs, setOutputs, showAllSteps }: RunnerProps) {
  const input = useDevToolsStore((state) => state.exprPlayground.expression);
  const currentPageId = useNavigationParam('pageKey');

  const expression = useMemo(() => {
    try {
      if (!input || input.length <= 0) {
        if (!outputs[0] || outputs[0]?.value !== '') {
          setOutputs([{ value: '', isError: false }]);
        }
        return undefined;
      }

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
      ExprValidation.throwIfInvalid(maybeExpression);

      return maybeExpression as Expression;
    } catch (e) {
      if (!outputs[0] || outputs[0]?.value !== e.message) {
        setOutputs([{ value: e.message, isError: true }]);
      }
      return undefined;
    }
  }, [input, outputs, setOutputs]);

  const dataSources = useExpressionDataSources(expression);
  useEffect(() => {
    if (expression === undefined) {
      return;
    }

    try {
      const calls: string[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onAfterFunctionCall = (path: string[], func: ExprFunctionName, args: any[], result: any) => {
        const indent = '  '.repeat(path.length);
        calls.push(`${indent}${JSON.stringify([func, ...args])} => ${JSON.stringify(result)}`);
      };

      const out = evalExpr(expression, dataSources, {
        returnType: ExprVal.Any,
        defaultValue: null,
        onAfterFunctionCall,
      });

      if (showAllSteps) {
        setOutputWithHistory(calls.join('\n'), false, outputs, setOutputs);
      } else {
        setOutputWithHistory(JSON.stringify(out), false, outputs, setOutputs);
      }
    } catch (e) {
      if (!outputs[0] || outputs[0]?.value !== e.message) {
        setOutputs([{ value: e.message, isError: true }]);
      }
    }
  }, [currentPageId, dataSources, expression, outputs, setOutputs, showAllSteps]);

  return null;
}

function setOutputWithHistory(
  newValue: string,
  isError: boolean,
  outputs: ExpressionResult[],
  setOutputs: (outputs: ExpressionResult[]) => void,
) {
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
}
