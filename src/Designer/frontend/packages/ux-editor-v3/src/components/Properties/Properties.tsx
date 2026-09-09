import { useRef, useState, useEffect } from 'react';
import { Calculations } from './Calculations';
import { Content } from './Content';
import { useTranslation } from 'react-i18next';
import { StudioDetails } from '@studio/components';
import { useFormItemContext } from '../../containers/FormItemContext';
import classes from './Properties.module.css';
import { Dynamics } from './Dynamics';

export const Properties = () => {
  const { t } = useTranslation();
  const { formItemId: formId } = useFormItemContext();
  const formIdRef = useRef(formId);

  const [openList, setOpenList] = useState<string[]>([]);

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
      <StudioDetails open={openList.includes('content')} onToggle={() => toggleOpen('content')}>
        <StudioDetails.Summary>{t('right_menu.content')}</StudioDetails.Summary>
        <StudioDetails.Content className={classes.accordionContent}>
          <Content />
        </StudioDetails.Content>
      </StudioDetails>
      <StudioDetails open={openList.includes('dynamics')} onToggle={() => toggleOpen('dynamics')}>
        <StudioDetails.Summary>{t('right_menu.dynamics')}</StudioDetails.Summary>
        <StudioDetails.Content className={classes.accordionContent}>
          {formId && <Dynamics />}
        </StudioDetails.Content>
      </StudioDetails>
      <StudioDetails
        open={openList.includes('calculations')}
        onToggle={() => toggleOpen('calculations')}
      >
        <StudioDetails.Summary>{t('right_menu.calculations')}</StudioDetails.Summary>
        <StudioDetails.Content className={classes.accordionContent}>
          <Calculations />
        </StudioDetails.Content>
      </StudioDetails>
    </div>
  );
};
