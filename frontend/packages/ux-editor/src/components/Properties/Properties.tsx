import React, { useEffect } from 'react';
import { Calculations } from './Calculations';
import { Text } from './Text';
import { useTranslation } from 'react-i18next';
import { Accordion } from '@digdir/design-system-react';
import { useFormItemContext } from '../../containers/FormItemContext';
import classes from './Properties.module.css';
import { Dynamics } from './Dynamics';
import { PropertiesHeader } from './PropertiesHeader';
import { EditFormComponent } from '../config/EditFormComponent';
import { DataModelBindings } from './DataModelBindings';

export const Properties = () => {
  const { t } = useTranslation();
  const { formItemId: formId, formItem: form, handleUpdate, debounceSave } = useFormItemContext();
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

  return (
    <div className={classes.root}>
      {form && (
        <PropertiesHeader
          form={form}
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
        <Accordion.Item open={openList.includes('datamodel')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('datamodel')}>
            {t('right_menu.dataModelBindings')}
          </Accordion.Header>
          <Accordion.Content>
            {formId ? <DataModelBindings /> : t('right_menu.content_empty')}
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item open={openList.includes('content')}>
          <Accordion.Header onHeaderClick={() => toggleOpen('content')}>
            {t('right_menu.content')}
          </Accordion.Header>
          <Accordion.Content>
            {formId ? (
              <EditFormComponent
                editFormId={formId}
                component={form}
                handleComponentUpdate={async (updatedComponent) => {
                  handleUpdate(updatedComponent);
                  debounceSave(formId, updatedComponent);
                }}
              />
            ) : (
              t('right_menu.content_empty')
            )}
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
