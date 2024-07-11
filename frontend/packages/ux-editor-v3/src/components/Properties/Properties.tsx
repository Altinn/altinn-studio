import React, { useEffect } from 'react';
import { Calculations } from './Calculations';
import { Content } from './Content';
import { useTranslation } from 'react-i18next';
import { Accordion } from '@digdir/designsystemet-react';
import { useFormItemContext } from '../../containers/FormItemContext';
import classes from './Properties.module.css';
import { Dynamics } from './Dynamics';

export const Properties = () => {
  const { t } = useTranslation();
  const { formItemId: formId } = useFormItemContext();
  const formIdRef = React.useRef(formId);

  const [openList, setOpenList] = React.useState<string[]>([]);

  useEffect(() => {
    if (formIdRef.current !== formId) {
      formIdRef.current = formId;
      if (formId && openList.length === 0) setOpenList(['content']);
    }
  }, [formId, openList.length]);

  const toggleOpen = (id: string) => {
    if (openList.includes(id)) {
      setOpenList(openList.filter((item) => item !== id));
    } else {
      setOpenList([...openList, id]);
    }
  };

  return (
    <div className={classes.root}>
      <Accordion color='subtle'>
        <Accordion.Item open={openList.includes('content')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('content')}>
            {t('right_menu.content')}
          </Accordion.Header>
          <Accordion.Content>
            <Content />
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('dynamics')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('dynamics')}>
            {t('right_menu.dynamics')}
          </Accordion.Header>
          <Accordion.Content>{formId && <Dynamics />}</Accordion.Content>
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
