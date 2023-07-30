import classes from './RightMenu.module.css';
import React, { useContext, useEffect }  from 'react';
import { ConditionalRenderingTab } from './ConditionalRenderingTab';
import { CalculationsTab } from './CalculationsTab';
import { ContentTab } from './ContentTab';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import { DynamicsTab } from './DynamicsTab';
import { Accordion } from 'app-shared/components/Accordion';
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
      <Accordion>
        <Accordion.Item open={openList.includes('content')}>
          <Accordion.Header onClick={() => toggleOpen('content')}>{t('right_menu.content')}</Accordion.Header>
          <Accordion.Content>
            <ContentTab />
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('dynamics')}>
          <Accordion.Header onClick={() => toggleOpen('dynamics')}>{t('right_menu.dynamics')}</Accordion.Header>
          <Accordion.Content>
          {
            showNewDynamics ?
            <DynamicsTab onShowNewDynamicsTab={setShowNewDynamics} showNewDynamicsTab={showNewDynamics}/> :
            <ConditionalRenderingTab onShowNewDynamicsTab={setShowNewDynamics} showNewDynamicsTab={showNewDynamics}/>
          }
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('calculations')}>
          <Accordion.Header onClick={(e) => toggleOpen('calculations')}>{t('right_menu.calculations')}</Accordion.Header>
          <Accordion.Content>
            <CalculationsTab />
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </div>
  );
};
