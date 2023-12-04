import React, { useEffect } from 'react';
import { ConditionalRendering } from './ConditionalRendering';
import { Calculations } from './Calculations';
import { Content } from './Content';
import { useTranslation } from 'react-i18next';
import { Expressions } from '../config/Expressions';
import { Accordion, Switch } from '@digdir/design-system-react';
import { useFormContext } from '../../containers/FormContext';
import {
  addFeatureFlagToLocalStorage,
  removeFeatureFlagFromLocalStorage,
  shouldDisplayFeature,
} from 'app-shared/utils/featureToggleUtils';
import classes from './Properties.module.css';

export const Properties = () => {
  const { t } = useTranslation();
  const [showNewExpressions, setShowNewExpressions] = React.useState<boolean>(
    shouldDisplayFeature('expressions'),
  );
  const { formId } = useFormContext();
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

  const handleToggleNewDynamics = (event: React.ChangeEvent<HTMLInputElement>) => {
    setShowNewExpressions(event.target.checked);
    // Ensure choice of feature toggling is persisted in local storage
    if (event.target.checked) {
      addFeatureFlagToLocalStorage('expressions');
    } else {
      removeFeatureFlagFromLocalStorage('expressions');
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
          <Accordion.Content>
            <>
              <Switch
                name={'new-dynamics-switch'}
                onChange={handleToggleNewDynamics}
                checked={showNewExpressions}
                size={'small'}
              >
                {t('right_menu.show_new_dynamics')}
              </Switch>
              {showNewExpressions ? (
                formId && <Expressions key={formId} />
              ) : (
                <ConditionalRendering />
              )}
            </>
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
