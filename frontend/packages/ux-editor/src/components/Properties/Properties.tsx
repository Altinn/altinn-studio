import React from 'react';
import { Text } from './Text';
import { useTranslation } from 'react-i18next';
import { Accordion } from '@digdir/designsystemet-react';
import { useFormItemContext } from '../../containers/FormItemContext';
import classes from './Properties.module.css';
import { Dynamics } from './Dynamics';
import { PropertiesHeader } from './PropertiesHeader';
import { EditFormComponent } from '../config/EditFormComponent';
import { DataModelBindings } from './DataModelBindings';
import { PageConfigPanel } from './PageConfigPanel';
import { DeprecatedCalculationsInfo } from '@altinn/ux-editor/components/Properties/DeprecatedCalculationsInfo';

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

  if (!formItem) {
    return (
      <div className={classes.root} key={formItemId}>
        <PageConfigPanel />
      </div>
    );
  }

  const isNotSubFormOrHasLayoutSet = formItem.type !== 'SubForm' || !!formItem.layoutSet;

  return (
    <div className={classes.root} key={formItemId}>
      <PropertiesHeader
        formItem={formItem}
        handleComponentUpdate={async (updatedComponent) => {
          handleUpdate(updatedComponent);
          debounceSave(formItemId, updatedComponent);
        }}
      />
      {isNotSubFormOrHasLayoutSet && (
        <Accordion color='subtle'>
          <Accordion.Item open={openList.includes('text')}>
            <Accordion.Header
              aria-label={t('right_menu.text_label')}
              onHeaderClick={() => toggleOpen('text')}
            >
              {t(formItem.type === 'Image' ? 'right_menu.text_and_image' : 'right_menu.text')}
            </Accordion.Header>
            <Accordion.Content className={classes.texts}>
              <Text />
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item open={openList.includes('dataModel')}>
            <Accordion.Header onHeaderClick={() => toggleOpen('dataModel')}>
              {t('right_menu.data_model_bindings')}
            </Accordion.Header>
            <Accordion.Content className={classes.dataModelBindings}>
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
                handleComponentUpdate={async (updatedComponent, mutateOptions) => {
                  handleUpdate(updatedComponent);
                  debounceSave(formItemId, updatedComponent, mutateOptions);
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
              <DeprecatedCalculationsInfo />
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      )}
    </div>
  );
};
