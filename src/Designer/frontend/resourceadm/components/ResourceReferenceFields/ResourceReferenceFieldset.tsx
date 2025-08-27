import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioFieldset,
  StudioTextfield,
  StudioNativeSelect,
} from 'libs/studio-components-legacy/src';
import type {
  ResourceFormError,
  ResourceReference,
  ResourceReferenceSource,
  ResourceReferenceType,
} from 'app-shared/types/ResourceAdm';
import { InputFieldErrorMessage } from '../ResourcePageInputs/InputFieldErrorMessage';
import { ResourceFieldHeader } from '../ResourcePageInputs/ResourceFieldHeader';

const referenceSourceOptions = [
  {
    value: 'Default',
    label: 'Default',
  },
  {
    value: 'Altinn2',
    label: 'Altinn2',
  },
  {
    value: 'Altinn3',
    label: 'Altinn3',
  },
  {
    value: 'ExternalPlatform',
    label: 'ExternalPlatform',
  },
];

const referenceTypeOptions = [
  {
    value: 'Default',
    label: 'Default',
  },
  {
    value: 'Uri',
    label: 'Uri',
  },
  {
    value: 'DelegationSchemeId',
    label: 'DelegationSchemeId',
  },
  {
    value: 'MaskinportenScope',
    label: 'MaskinportenScope',
  },
  {
    value: 'ServiceCode',
    label: 'ServiceCode',
  },
  {
    value: 'ServiceEditionCode',
    label: 'ServiceEditionCode',
  },
];

type ResourceReferenceFieldsetProps = {
  /**
   * The resourceReference to display in the fieldset
   */
  resourceReference: ResourceReference;
  /**
   * Function to be executed when leaving a text field
   * @param resourceReference the resourceReference
   * @returns void
   */
  onChangeResourceReferenceField: (resourceReference: ResourceReference) => void;
  /**
   * Field error messages
   */
  errors: ResourceFormError[];
  /**
   * Whether this field is required or not
   */
  required?: boolean;
  /**
   * Index of fieldset
   */
  index: number;
};

/**
 * @component
 *    Displays the fieldset with the 3 fields in a ResourceReference
 *
 * @property {ResourceReference}[resourceReference] - The resourceReference to display in the fieldset
 * @property {function}[onChangeResourceReferenceField] - Function to be executed when resourceReference is changed
 * @property {ResourceFormError[]}[errors] - Field error messages
 * @property {boolean}[required] - Whether this field is required or not
 * @property {number}[index] - Index of fieldset
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceReferenceFieldset = ({
  resourceReference,
  onChangeResourceReferenceField,
  errors,
  required,
  index,
}: ResourceReferenceFieldsetProps): React.JSX.Element => {
  const { t } = useTranslation();

  const [referenceSource, setReferenceSource] = useState<ResourceReferenceSource>(
    resourceReference.referenceSource,
  );
  const [referenceType, setReferenceType] = useState<ResourceReferenceType>(
    resourceReference.referenceType,
  );
  const [reference, setReference] = useState(resourceReference.reference);

  const fieldError = errors.filter((error) => error.index === index);
  const hasError = fieldError.length > 0;

  const handleChangeReferenceSource = (newSource: ResourceReferenceSource): void => {
    setReferenceSource(newSource);
    onChangeResourceReferenceField({
      ...resourceReference,
      referenceSource: newSource,
    });
  };

  const handleChangeReferenceType = (newType: ResourceReferenceType): void => {
    setReferenceType(newType);
    onChangeResourceReferenceField({
      ...resourceReference,
      referenceType: newType,
    });
  };

  const handleBlurReference = (): void => {
    onChangeResourceReferenceField({ ...resourceReference, reference });
  };

  return (
    <>
      <StudioFieldset
        legend={
          <ResourceFieldHeader
            label={t('resourceadm.about_resource_references', { index: index + 1 })}
            required={required}
          />
        }
        description={t('resourceadm.about_resource_references_description')}
        size='sm'
      >
        <StudioNativeSelect
          size='sm'
          onChange={(event) =>
            handleChangeReferenceSource(event.target.value as ResourceReferenceSource)
          }
          value={referenceSource}
          label={t('resourceadm.about_resource_reference_source')}
          error={hasError}
        >
          {referenceSourceOptions.map((opt) => {
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </StudioNativeSelect>
        <StudioNativeSelect
          id={index === 0 ? 'resourceReferences' : undefined}
          size='sm'
          onChange={(event) =>
            handleChangeReferenceType(event.target.value as ResourceReferenceType)
          }
          value={referenceType}
          label={t('resourceadm.about_resource_reference_type')}
          error={hasError}
        >
          {referenceTypeOptions.map((opt) => {
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </StudioNativeSelect>
        <StudioTextfield
          id={`resourceReferences-${index}`}
          label={t('resourceadm.about_resource_reference')}
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={hasError}
          onBlur={handleBlurReference}
        />
      </StudioFieldset>
      {fieldError.map((error, errorIndex) => (
        <InputFieldErrorMessage key={errorIndex} message={error.error} />
      ))}
    </>
  );
};
