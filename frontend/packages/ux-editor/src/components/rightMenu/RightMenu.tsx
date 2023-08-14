import classes from './RightMenu.module.css';
import React, { useContext, useEffect }  from 'react';
import { ConditionalRendering } from './ConditionalRendering';
import { Calculations } from './Calculations';
import { Content } from './Content';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { Dynamics } from './Dynamics';
import { Accordion } from '@digdir/design-system-react';
import { FormContext } from '../../containers/FormContext';

export interface RightMenuProps {
  className?: string;
}

export const RightMenu = ({ className }: RightMenuProps) => {
  const { t } = useTranslation();
  const [showNewDynamics, setShowNewDynamics] = React.useState<boolean>(false);
  const { formId } = useContext(FormContext);
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
      setOpenList(openList.filter(item => item !== id));
    } else {
      setOpenList([...openList, id]);
    }
  };

  return (
    <div className={cn(className, classes.rightMenu)} data-testid={'ux-editor.right-menu'}>
      <Accordion color="subtle">
        <Accordion.Item open={openList.includes('content')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('content')}>{t('right_menu.content')}</Accordion.Header>
          <Accordion.Content>
            <Content />
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('dynamics')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('dynamics')}>{t('right_menu.dynamics')}</Accordion.Header>
          <Accordion.Content>
          {
            showNewDynamics ?
            <Dynamics onShowNewDynamics={setShowNewDynamics} showNewDynamics={showNewDynamics}/> :
            <ConditionalRendering onShowNewDynamics={setShowNewDynamics} showNewDynamics={showNewDynamics}/>
          }
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('calculations')}>
          <Accordion.Header onHeaderClick={(e) => toggleOpen('calculations')}>{t('right_menu.calculations')}</Accordion.Header>
          <Accordion.Content>
            <Calculations />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
