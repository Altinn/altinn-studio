import { Text } from '../Text';
import { useFormItemContext } from '../../../containers/FormItemContext';
import { Accordion } from '@digdir/designsystemet-react';
import { ComponentType } from 'app-shared/types/ComponentType';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Summary2Override } from '../../config/componentSpecificContent/Summary2/Override/Summary2Override';
import { EditFormComponent } from '../../config/EditFormComponent';
import { DataModelBindings } from '../DataModelBindings';
import { DeprecatedCalculationsInfo } from '../DeprecatedCalculationsInfo';
import { Dynamics } from '../Dynamics';
import { PropertiesHeader } from '../PropertiesHeader';
import classes from './ComponentConfigPanel.module.css';
import { useAppContext } from '../../../hooks/useAppContext';
import { formItemConfigs } from '../../../data/formItemConfig';

import type { ItemType } from '../ItemType';
import type { SelectedItem } from '../../../AppContext';
import { UnknownComponentAlert } from '../../UnknownComponentAlert';

type ComponentConfigPanelProps = {
  selectedItem: Extract<SelectedItem, { type: ItemType.Component }>;
};

export const ComponentConfigPanel = ({ selectedItem }: ComponentConfigPanelProps) => {
  const { t } = useTranslation();
  const { setSelectedItem } = useAppContext();
  const { formItemId, formItem, handleUpdate, debounceSave } = useFormItemContext();
  const [openList, setOpenList] = React.useState<string[]>([]);

  const toggleOpen = (id: string) =>
    setOpenList((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  if (!formItem) {
    setSelectedItem(undefined);
    return null;
  }

  const isNotSubformOrHasLayoutSet = formItem.type !== 'Subform' || !!formItem.layoutSet;

  const isUnknownInternalComponent: boolean = !formItemConfigs[formItem.type];

  if (isUnknownInternalComponent) {
    return (
      <div className={classes.unknownComponentAlert}>
        <UnknownComponentAlert componentName={formItem.type} />
      </div>
    );
  }

  return (
    <>
      <PropertiesHeader
        formItem={formItem}
        handleComponentUpdate={async (updatedComponent) => {
          handleUpdate(updatedComponent);
          debounceSave(formItemId, updatedComponent);
        }}
      />
      {isNotSubformOrHasLayoutSet && (
        <Accordion color='subtle'>
          {formItem.type === ComponentType.Summary2 && (
            <Accordion.Item open={openList.includes('summary2overrides')}>
              <Accordion.Header onHeaderClick={() => toggleOpen('summary2overrides')}>
                {t('ux_editor.component_properties.summary.override.title')}
              </Accordion.Header>
              <Accordion.Content>
                <Summary2Override component={formItem} onChange={handleUpdate} />
              </Accordion.Content>
            </Accordion.Item>
          )}
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
    </>
  );
};
