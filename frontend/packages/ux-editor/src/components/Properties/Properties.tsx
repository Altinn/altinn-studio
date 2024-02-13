import React, { useEffect } from 'react';
import { Calculations } from './Calculations';
import { Content } from './Content';
import { Text } from './Text';
import { useTranslation } from 'react-i18next';
import { Accordion } from '@digdir/design-system-react';
import { useFormContext } from '../../containers/FormContext';
import classes from './Properties.module.css';
import { Dynamics } from './Dynamics';
import { PropertiesHeader } from './PropertiesHeader';
import { isContainer } from '../../utils/formItemUtils';
import type { DataLookupOptions, Expression } from '@studio/components';
import { DataLookupFuncName, StudioExpression } from '@studio/components';
import { useExpressionTexts } from 'app-shared/hooks/useExpressionTexts';

export const Properties = () => {
  const { t } = useTranslation();
  const { formId, form, handleUpdate, debounceSave } = useFormContext();
  const formIdRef = React.useRef(formId);

  const [openList, setOpenList] = React.useState<string[]>([]);

  useEffect(() => {
    if (formIdRef.current !== formId) {
      formIdRef.current = formId;
      if (formId && openList.length === 0) setOpenList(['text']);
    }
  }, [formId, openList.length]);

  const toggleOpen = (id: string) => {
    if (openList.includes(id)) {
      setOpenList(openList.filter((item) => item !== id));
    } else {
      setOpenList([...openList, id]);
    }
  };

  const dataLookupOptions: DataLookupOptions = {
    [DataLookupFuncName.Component]: ['test', 'asdasdsd'],
    [DataLookupFuncName.DataModel]: ['#/sdfdsf/asdad'],
  };

  const [expressionState, setExpressionState] = React.useState<Expression>(true);
  const handleExpressionChange = (expression: Expression) => {
    setExpressionState(expression);
    console.log(expression);
  };

  const expressionTexts = useExpressionTexts();

  return (
    <div className={classes.root}>
      <StudioExpression
        expression={expressionState}
        onChange={handleExpressionChange}
        dataLookupOptions={dataLookupOptions}
        texts={expressionTexts}
      />
      {form && !isContainer(form) && (
        <PropertiesHeader
          form={form}
          formId={formId}
          handleComponentUpdate={async (updatedComponent) => {
            handleUpdate(updatedComponent);
            debounceSave(formId, updatedComponent);
          }}
        />
      )}
      <Accordion color='subtle'>
        <Accordion.Item open={openList.includes('text')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('text')}>
            {t('right_menu.text')}
          </Accordion.Header>
          <Accordion.Content>{formId ? <Text /> : t('right_menu.content_empty')}</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('content')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('content')}>
            {t('right_menu.content')}
          </Accordion.Header>
          <Accordion.Content>
            {formId ? <Content /> : t('right_menu.content_empty')}
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('dynamics')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('dynamics')}>
            {t('right_menu.dynamics')}
          </Accordion.Header>
          <Accordion.Content>
            {formId ? <Dynamics /> : t('right_menu.content_empty')}
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('calculations')}>
          <Accordion.Header onHeaderClick={(e) => toggleOpen('calculations')}>
            {t('right_menu.calculations')}
          </Accordion.Header>
          <Accordion.Content>
            <Calculations />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
