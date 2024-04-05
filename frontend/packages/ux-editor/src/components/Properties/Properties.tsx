import React from 'react';
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
import { PageConfigPanel } from './PageConfigPanel';

export const Properties = () => {
  const { t } = useTranslation();
  const { formItemId, formItem, handleUpdate, debounceSave } = useFormItemContext();
  const [openList, setOpenList] = React.useState<string[]>([]);

  const toggleOpen = (id: string) => {
    if (openList.includes(id)) {
      setOpenList(openList.filter((item) => item !== id));
    } else {
      setOpenList([...openList, id]);
    }
  };

  return (
    <div className={classes.root}>
      {!formItem ? (
        <PageConfigPanel />
      ) : (
        <>
          <PropertiesHeader
            formItem={formItem}
            handleComponentUpdate={async (updatedComponent) => {
              handleUpdate(updatedComponent);
              debounceSave(formItemId, updatedComponent);
            }}
          />
          <Accordion color='subtle'>
            <Accordion.Item open={openList.includes('text')}>
              <Accordion.Header
                aria-label={t('right_menu.text_label')}
                onHeaderClick={() => toggleOpen('text')}
              >
                {t('right_menu.text')}
              </Accordion.Header>
              <Accordion.Content className={classes.texts}>
                <Text />
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item open={openList.includes('datamodel')}>
              <Accordion.Header onHeaderClick={() => toggleOpen('datamodel')}>
                {t('right_menu.dataModelBindings')}
              </Accordion.Header>
              <Accordion.Content className={classes.datamodelBindings}>
                <DataModelBindings />
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item open={openList.includes('content')}>
              <Accordion.Header onHeaderClick={() => toggleOpen('content')}>
                {t('right_menu.content')}
              </Accordion.Header>
              <Accordion.Content>
                <EditFormComponent
                  editFormId={formItemId}
                  component={formItem}
                  handleComponentUpdate={async (updatedComponent) => {
                    handleUpdate(updatedComponent);
                    debounceSave(formItemId, updatedComponent);
                  }}
                />
              </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item open={openList.includes('dynamics')}>
              <Accordion.Header onHeaderClick={() => toggleOpen('dynamics')}>
                {t('right_menu.dynamics')}
              </Accordion.Header>
              <Accordion.Content>
                <Dynamics />
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
        </>
      )}
    </div>
  );
};
