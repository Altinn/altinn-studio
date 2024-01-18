import React, { useState } from 'react';
import type { ResourceContactPoint } from 'app-shared/types/ResourceAdm';
import { Fieldset } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { ResourceContactPointTextField } from './ResourceContactPointTextField';
import { InputFieldErrorMessage } from '../ResourcePageInputs/InputFieldErrorMessage';

type ResourceContactPointFieldsetProps = {
  /**
   * The contact point to display in the fieldset
   */
  contactPoint: ResourceContactPoint;
  /**
   * Function to be executed when leaving a text field
   * @param contactPoint the contact point
   * @returns void
   */
  onLeaveTextFields: (contactPoint: ResourceContactPoint) => void;
  /**
   * Function to be executed when the field is focused
   * @returns void
   */
  onFocus: () => void;
  /**
   * If the error should be shown
   */
  showErrors: boolean;
};

/**
 * @component
 *    Displays the fieldsset with the 4 fields in a ContactPoint
 *
 * @property {ResourceContactPoint}[contactPoint] - The contact point to display in the fieldset
 * @property {function}[onLeaveTextFields] - Function to be executed when leaving a text field
 * @property {function}[onFocus] - Function to be executed when the field is focused
 * @property {boolean}[showErrors] - Function to be executed when leaving a text field
 *
 * @returns {React.JSX.Element} - The rendered component
 */
export const ResourceContactPointFieldset = ({
  contactPoint,
  onLeaveTextFields,
  onFocus,
  showErrors,
}: ResourceContactPointFieldsetProps): React.JSX.Element => {
  const { t } = useTranslation();

  const [category, setCategory] = useState(contactPoint.category);
  const [email, setEmail] = useState(contactPoint.email);
  const [telephone, setTelephone] = useState(contactPoint.telephone);
  const [contactPage, setContactPage] = useState(contactPoint.contactPage);

  const isValid = category !== '' || email !== '' || telephone !== '' || contactPage !== '';
  const hasError = !isValid && showErrors;

  return (
    <>
      <Fieldset
        legend={t('resourceadm.about_resource_contact_legend')}
        description={t('resourceadm.about_resource_contact_description')}
        size='small'
      >
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_category')}
          value={category}
          onChange={(value: string) => setCategory(value)}
          onFocus={onFocus}
          onBlur={() => {
            onLeaveTextFields({ ...contactPoint, category });
          }}
          isValid={!hasError}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_email')}
          value={email}
          onChange={(value: string) => setEmail(value)}
          onFocus={onFocus}
          onBlur={() => {
            onLeaveTextFields({ ...contactPoint, email });
          }}
          isValid={!hasError}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_telephone')}
          value={telephone}
          onChange={(value: string) => setTelephone(value)}
          onFocus={onFocus}
          onBlur={() => {
            onLeaveTextFields({ ...contactPoint, telephone });
          }}
          isValid={!hasError}
        />
        <ResourceContactPointTextField
          label={t('resourceadm.about_resource_contact_label_contactpage')}
          value={contactPage}
          onChange={(value: string) => setContactPage(value)}
          onFocus={onFocus}
          onBlur={() => {
            onLeaveTextFields({ ...contactPoint, contactPage });
          }}
          isValid={!hasError}
        />
      </Fieldset>
      {hasError && (
        <InputFieldErrorMessage message={t('resourceadm.about_resource_contact_point_error')} />
      )}
    </>
  );
};
