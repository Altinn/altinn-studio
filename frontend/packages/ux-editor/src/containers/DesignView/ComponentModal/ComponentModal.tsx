import React from 'react';
import {
  StudioHeading,
  StudioIconTextfield,
  StudioModal,
  StudioParagraph,
  StudioRecommendedNextAction,
} from '@studio/components';
import type { ComponentType } from 'app-shared/types/ComponentType';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import type { IToolbarElement } from '../../../types/global';
import classes from './ComponentModal.module.css';
import { useTranslation } from 'react-i18next';
import {
  getComponentHelperTextByComponentType,
  getComponentTitleByComponentType,
} from '../../../utils/language';
import { PencilIcon } from '@studio/icons';
import { ItemCategory } from '../ItemCategory/ItemCategory';

export type ComponentModalProps = {
  onAddComponent: (addedItem: AddedItemProps) => void;
  isOpen: boolean;
  onClose: () => void;
  availableComponents: KeyValuePairs<IToolbarElement[]>;
  generateComponentId: (type: ComponentType) => string;
};

export type AddedItemProps = {
  componentType: ComponentType;
  componentId: string;
};

export const ComponentModal = ({
  onAddComponent,
  isOpen,
  onClose,
  availableComponents,
  generateComponentId,
}: ComponentModalProps) => {
  const { t } = useTranslation();
  const [addedComponent, setAddedComponent] = React.useState<AddedItemProps | null>(null);

  const handleCloseModal = () => {
    setAddedComponent(null);
    onClose();
  };

  return (
    <StudioModal
      isOpen={isOpen}
      onClose={handleCloseModal}
      title={<StudioHeading level={1}>Velg komponent</StudioHeading>}
      closeButtonLabel='Lukk'
    >
      <div className={classes.root}>
        <div className={classes.allComponentsWrapper}>
          {Object.keys(availableComponents).map((key) => {
            return (
              <ItemCategory
                key={key}
                category={key}
                items={availableComponents[key]}
                selectedItemType={addedComponent?.componentType}
                setAddedItem={setAddedComponent}
                generateComponentId={generateComponentId}
              />
            );
          })}
        </div>
        <div className={classes.componentsInfoWrapper}>
          <StudioHeading level={2} size='medium' spacing>
            {t('ux_editor.component_add_item.info_heading')}
          </StudioHeading>
          {!addedComponent && <p>{t('ux_editor.component_add_item.info_no_component_selected')}</p>}
          {addedComponent && (
            <div>
              <p>
                {t('ux_editor.component_add_item.info_component_selected', {
                  componentName: getComponentTitleByComponentType(addedComponent.componentType, t),
                })}
              </p>
              <StudioParagraph spacing size='small'>
                {getComponentHelperTextByComponentType(addedComponent.componentType, t)}
              </StudioParagraph>
            </div>
          )}
          {addedComponent && (
            <StudioRecommendedNextAction
              onSave={() => {
                onAddComponent(addedComponent);
                setAddedComponent(null);
              }}
              onSkip={() => {
                onAddComponent({
                  ...addedComponent,
                  componentId: generateComponentId(addedComponent.componentType),
                });
                setAddedComponent(null);
              }}
              saveButtonText='Legg til med endringer'
              skipButtonText='Bruk standardinnstillinger'
              title={`Legg til ${getComponentTitleByComponentType(addedComponent.componentType, t)}`}
              description='Her kan du endre standardinnstillinger for komponenten. Du kan også hoppe over dette og gjøre det senere.'
            >
              <StudioIconTextfield
                icon={<PencilIcon />}
                label={t('Komponent ID')}
                value={addedComponent.componentId}
                onChange={(event: any) => {
                  setAddedComponent({ ...addedComponent, componentId: event.target.value });
                }}
              />
            </StudioRecommendedNextAction>
          )}
        </div>
      </div>
    </StudioModal>
  );
};
