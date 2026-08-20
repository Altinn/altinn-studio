import { Text } from '../Text';
import { useFormItemContext } from '../../../containers/FormItemContext';
import { ComponentType } from 'app-shared/types/ComponentType';
import { StudioDetails } from '@studio/components';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Summary2Override } from '../../config/componentSpecificContent/Summary2/Override/Summary2Override';
import { EditFormComponent } from '../../config/EditFormComponent';
import { DataModelBindings } from '../DataModelBindings';
import { PropertiesHeader } from '../PropertiesHeader';
import classes from './ComponentConfigPanel.module.css';
import { useAppContext } from '../../../hooks/useAppContext';
import { formItemConfigs } from '../../../data/formItemConfig';
import type { ItemType } from '../ItemType';
import type { SelectedItem } from '../../../AppContext';
import { UnknownComponentAlert } from '../../UnknownComponentAlert';
import { Expressions } from '../../config/Expressions';
import { getComponentDefinition } from '../../../data/componentCatalog';

type ComponentConfigPanelProps = {
  selectedItem: Extract<SelectedItem, { type: ItemType.Component }>;
};

export const ComponentConfigPanel = ({ selectedItem }: ComponentConfigPanelProps) => {
  const { t } = useTranslation();
  const { setSelectedItem } = useAppContext();
  const { formItemId, formItem, handleUpdate, debounceSave } = useFormItemContext();
  const [openList, setOpenList] = useState<string[]>([]);

  const toggleOpen = (id: string) =>
    setOpenList((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  if (!formItem) {
    setSelectedItem(undefined);
    return null;
  }

  const isUnknownInternalComponent: boolean = !formItemConfigs[formItem.type];
  if (isUnknownInternalComponent)
    return (
      <div className={classes.unknownComponentAlert}>
        <UnknownComponentAlert componentName={formItem.type} />
      </div>
    );

  const isSubformWithoutLayoutSet = formItem.type === 'Subform' && !formItem.layoutSet;
  if (isSubformWithoutLayoutSet) return <ComponentConfigHeader />;

  const properties = getComponentDefinition(formItem.type)?.properties ?? {};
  const { textResourceBindings, dataModelBindings, ...otherProperties } = properties;

  const hasTextProperties = Boolean(textResourceBindings);
  const hasDataModelBindingProperties = Boolean(dataModelBindings);
  const hasOtherProperties = Object.keys(otherProperties).length > 0;

  return (
    <>
      <ComponentConfigHeader />
      {formItem.type === ComponentType.Summary2 && (
        <StudioDetails
          onToggle={() => toggleOpen('summary2overrides')}
          open={openList.includes('summary2overrides')}
          key={`${formItemId}-summary2overrides`}
        >
          <StudioDetails.Summary>
            {t('ux_editor.component_properties.summary.override.title')}
          </StudioDetails.Summary>
          <StudioDetails.Content className={classes.accordionContent}>
            <Summary2Override component={formItem} onChange={handleUpdate} />
          </StudioDetails.Content>
        </StudioDetails>
      )}
      {hasTextProperties && (
        <StudioDetails
          onToggle={() => toggleOpen('text')}
          open={openList.includes('text')}
          key={`${formItemId}-textResourceBindings`}
        >
          <StudioDetails.Summary aria-label={t('right_menu.text_label')}>
            {t(formItem.type === 'Image' ? 'right_menu.text_and_image' : 'right_menu.text')}
          </StudioDetails.Summary>
          <StudioDetails.Content className={classes.accordionContent}>
            <Text />
          </StudioDetails.Content>
        </StudioDetails>
      )}
      {hasDataModelBindingProperties && (
        <StudioDetails
          onToggle={() => toggleOpen('dataModel')}
          open={openList.includes('dataModel')}
          key={`${formItemId}-dataModelBindings`}
        >
          <StudioDetails.Summary>{t('right_menu.data_model_bindings')}</StudioDetails.Summary>
          <StudioDetails.Content className={classes.accordionContent}>
            <DataModelBindings />
          </StudioDetails.Content>
        </StudioDetails>
      )}
      {hasOtherProperties && (
        <StudioDetails
          onToggle={() => toggleOpen('content')}
          open={openList.includes('content')}
          key={`${formItemId}-content`}
        >
          <StudioDetails.Summary>{t('right_menu.content')}</StudioDetails.Summary>
          <StudioDetails.Content className={classes.accordionContent}>
            <EditFormComponent
              editFormId={formItemId}
              component={formItem}
              handleComponentUpdate={async (updatedComponent, mutateOptions) => {
                handleUpdate(updatedComponent);
                debounceSave(formItemId, updatedComponent, mutateOptions);
              }}
            />
          </StudioDetails.Content>
        </StudioDetails>
      )}
      <StudioDetails
        onToggle={() => toggleOpen('dynamics')}
        open={openList.includes('dynamics')}
        key={`${formItemId}-dynamics`}
      >
        <StudioDetails.Summary>{t('right_menu.dynamics')}</StudioDetails.Summary>
        <StudioDetails.Content>
          <Expressions />
        </StudioDetails.Content>
      </StudioDetails>
    </>
  );
};

const ComponentConfigHeader = () => {
  const { formItemId, formItem, handleUpdate, debounceSave } = useFormItemContext();
  return (
    <PropertiesHeader
      formItem={formItem}
      handleComponentUpdate={async (updatedComponent) => {
        handleUpdate(updatedComponent);
        debounceSave(formItemId, updatedComponent);
      }}
    />
  );
};
