import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fieldset, Textfield, NativeSelect } from '@digdir/design-system-react';
import type {
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
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * If the error should be shown
   */
  showErrors: boolean;
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
 * @property {function}[onFocus] - Function to be executed when the field is focused
 * @property {boolean}[showErrors] - If errors should be shown or not
 * @property {boolean}[required] - Whether this field is required or not
 * @property {number}[index] - Index of fieldset
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceReferenceFieldset = ({
  resourceReference,
  onChangeResourceReferenceField,
  onFocus,
  showErrors,
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

  const isValid = referenceSource && referenceType && reference;
  const hasError = !isValid && showErrors;

  return (
    <>
      <Fieldset
        legend={
          <ResourceFieldHeader
            label={t('resourceadm.about_resource_references', { index: index + 1 })}
            required={required}
          />
        }
        description={t('resourceadm.about_resource_references_description')}
        size='small'
      >
        <NativeSelect
          size='small'
          onChange={(event) => setReferenceSource(event.target.value as ResourceReferenceSource)}
          value={referenceSource}
          label={t('resourceadm.about_resource_reference_source')}
          error={hasError}
          onFocus={onFocus}
          onBlur={() => {
            onChangeResourceReferenceField({ ...resourceReference, referenceSource });
          }}
        >
          {referenceSourceOptions.map((opt) => {
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </NativeSelect>
        <NativeSelect
          size='small'
          onChange={(event) => setReferenceType(event.target.value as ResourceReferenceType)}
          value={referenceType}
          label={t('resourceadm.about_resource_reference_type')}
          error={hasError}
          onFocus={onFocus}
          onBlur={() => {
            onChangeResourceReferenceField({ ...resourceReference, referenceType });
          }}
        >
          {referenceTypeOptions.map((opt) => {
            return (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            );
          })}
        </NativeSelect>
        <Textfield
          label={t('resourceadm.about_resource_reference')}
          size='small'
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={hasError}
          onFocus={onFocus}
          onBlur={() => {
            onChangeResourceReferenceField({ ...resourceReference, reference });
          }}
        />
      </Fieldset>
      {hasError && (
        <InputFieldErrorMessage message={t('resourceadm.about_resource_reference_error')} />
      )}
    </>
  );
};
