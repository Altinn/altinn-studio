import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Fieldset, Radio, Textfield } from '@digdir/design-system-react';
import type {
  ResourceReference,
  ResourceReferenceSource,
  ResourceReferenceType,
} from 'app-shared/types/ResourceAdm';
import { InputFieldErrorMessage } from '../ResourcePageInputs/InputFieldErrorMessage';

const referenceSourceOptions = [
  {
    value: 'Default',
    label: 'Default',
  },
  {
    value: 'Altinn1',
    label: 'Altinn1',
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
   * If the error should be shown
   */
  showErrors: boolean;
};

/**
 * @component
 *    Displays the fieldset with the 3 fields in a ResourceReference
 *
 * @property {ResourceReference}[resourceReference] - The resourceReference to display in the fieldset
 * @property {function}[onChangeResourceReferenceField] - Function to be executed when resourceReference is changed
 * @property {boolean}[showErrors] - If errors should be shown or not
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const ResourceReferenceFieldset = ({
  resourceReference,
  onChangeResourceReferenceField,
  showErrors,
}: ResourceReferenceFieldsetProps): React.ReactNode => {
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
        legend={t('resourceadm.about_resource_references')}
        description={t('resourceadm.about_resource_references_description')}
        size='small'
      >
        <Radio.Group
          size='small'
          onChange={(value: ResourceReferenceSource) => setReferenceSource(value)}
          value={referenceSource}
          legend={t('resourceadm.about_resource_reference_source')}
          error={hasError}
          onBlur={() => {
            onChangeResourceReferenceField({ ...resourceReference, referenceSource });
          }}
        >
          {referenceSourceOptions.map((opt) => {
            return (
              <Radio key={opt.value} value={opt.value}>
                {opt.label}
              </Radio>
            );
          })}
        </Radio.Group>
        <Radio.Group
          size='small'
          onChange={(value: ResourceReferenceType) => setReferenceType(value)}
          value={referenceType}
          legend={t('resourceadm.about_resource_reference_type')}
          error={hasError}
          onBlur={() => {
            onChangeResourceReferenceField({ ...resourceReference, referenceType });
          }}
        >
          {referenceTypeOptions.map((opt) => {
            return (
              <Radio key={opt.value} value={opt.value}>
                {opt.label}
              </Radio>
            );
          })}
        </Radio.Group>
        <Textfield
          label={t('resourceadm.about_resource_reference')}
          size='small'
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          error={hasError}
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
