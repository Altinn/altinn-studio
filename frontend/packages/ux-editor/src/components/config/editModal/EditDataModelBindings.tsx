import type { IGenericEditComponent } from '../componentConfig';
import { getMinOccursFromDataModel, getXsdDataTypeFromDataModel } from '../../../utils/datamodel';
import { ComponentType } from 'app-shared/types/ComponentType';
import React, { useState } from 'react';
import { useText } from '../../../hooks';
import { SelectDataModelComponent } from '../SelectDataModelComponent';
import { useDatamodelMetadataQuery } from '../../../hooks/queries/useDatamodelMetadataQuery';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { LinkIcon, CheckmarkIcon, TrashIcon, PencilWritingIcon } from '@navikt/aksel-icons';
import { Link } from 'react-router-dom';
import classes from './EditDataModelBindings.module.css';
import cn from 'classnames';

export interface EditDataModelBindingsProps extends IGenericEditComponent {
  renderOptions?: {
    label?: string;
    returnValue?: any;
    key?: string;
    uniqueKey?: any;
  };
  helpText?: string;
}

export const EditDataModelBindings = ({
  component,
  handleComponentChange,
  renderOptions,
  helpText,
}: EditDataModelBindingsProps) => {
  const { org, app } = useStudioUrlParams();
  const { data } = useDatamodelMetadataQuery(org, app);
  const t = useText();

  const handleDataModelChange = (selectedDataModelElement: string, key = 'simpleBinding') => {
    handleComponentChange({
      ...component,
      dataModelBindings: {
        ...component.dataModelBindings,
        [key]: selectedDataModelElement,
      },
      required: getMinOccursFromDataModel(selectedDataModelElement, data) > 0,
      timeStamp:
        component.type === ComponentType.Datepicker
          ? getXsdDataTypeFromDataModel(selectedDataModelElement, data) === 'DateTime'
          : undefined,
    });
  };

  const { uniqueKey, key, label } = renderOptions || {};
  const [linkIconVisible, setLinkIconVisible] = useState(true);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [CheckmarkAndTrashIconsVisible, setCheckmarkAndTrashIconsVisible] = useState(false);
  const [checkmarkClicked, setCheckmarkClicked] = useState(false);
  const [isLinkedDatamodelHovered, setIsLinkedDatamodelHovered] = useState(false);
  const handleHoverActive = () => setIsLinkedDatamodelHovered(true);
  const handleHoverDisabled = () => setIsLinkedDatamodelHovered(false);
  const [selectedOption, setSelectedOption] = useState<string | undefined>(
    component.dataModelBindings[key || 'simpleBinding'],
  );
  const toggleDropdown = () => {
    setDropdownVisible(true);
    setLinkIconVisible(false);
  };

  const renderIcons = () => {
    return (
      <div>
        {isLinkedDatamodelHovered ? (
          <PencilWritingIcon
            className={classes.pencilWritingIcon}
            onClick={() => {
              setDropdownVisible(true);
              setLinkIconVisible(false);
              setCheckmarkAndTrashIconsVisible(false);
              setCheckmarkClicked(false);
              setIsLinkedDatamodelHovered(false);
            }}
          />
        ) : (
          <CheckmarkIcon
            className={classes.checkmarkIcon}
            onClick={() => {
              setCheckmarkClicked(true);
              setDropdownVisible(false);
              setCheckmarkAndTrashIconsVisible(false);
            }}
          />
        )}

        <TrashIcon
          className={classes.trashIcon}
          onClick={() => {
            setDropdownVisible(false);
            setLinkIconVisible(true);
            setCheckmarkAndTrashIconsVisible(false);
            setCheckmarkClicked(false);
            setIsLinkedDatamodelHovered(false);
          }}
        />
      </div>
    );
  };

  return (
    <div key={uniqueKey || ''}>
      {linkIconVisible && (
        <Link to='' onClick={toggleDropdown}>
          <div className={classes.datamodelLink}>
            <LinkIcon className={classes.linkIcon} />
            {t('ux_editor.modal_properties_data_model_link')}
          </div>
        </Link>
      )}
      <div className={classes.dropdownContainer}>
        {dropdownVisible && (
          <>
            <div className={classes.dropdown}>
              <SelectDataModelComponent
                propertyPath={`definitions/component/properties/dataModelBindings/properties/${
                  key || 'simpleBinding'
                }`}
                label={
                  label
                    ? `${t('ux_editor.modal_properties_data_model_helper')} ${t(
                        'general.for',
                      )} ${label}`
                    : t('ux_editor.modal_properties_data_model_helper')
                }
                componentType={component.type}
                inputId={`selectDataModelSelect-${label}`}
                selectedElement={
                  component.dataModelBindings
                    ? component.dataModelBindings[key || 'simpleBinding']
                    : undefined
                }
                onDataModelChange={(dataModelField: string) => {
                  handleDataModelChange(dataModelField, key);
                  setSelectedOption(dataModelField);
                  setCheckmarkAndTrashIconsVisible(true);
                }}
                noOptionsMessage={t('general.no_options')}
                helpText={helpText}
              />
            </div>

            {CheckmarkAndTrashIconsVisible && dropdownVisible && renderIcons()}
          </>
        )}
      </div>
      {checkmarkClicked && selectedOption && (
        <div
          className={cn(classes.linkedDatamodelContainer, classes.hoveredOption)}
          onMouseOver={handleHoverActive}
          onMouseLeave={handleHoverDisabled}
        >
          <LinkIcon />
          {selectedOption}
          {renderIcons()}
        </div>
      )}
    </div>
  );
};
