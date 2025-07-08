import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import type { AppConfigFormError } from 'app-shared/types/AppConfigFormError';
import { StudioCard, StudioFieldset, StudioTag, StudioTextfield } from '@studio/components';
import { useTranslation } from 'react-i18next';

type ContactPointCardProps = {
  contactPoint: ContactPoint;
  onContactPointsChanged: (contactPoint: ContactPoint) => void;
  errors: AppConfigFormError[];
  required?: boolean;
  index: number;
  id: string;
};

export function ContactPointCard({
  contactPoint,
  onContactPointsChanged,
  errors,
  required = false,
  index,
  id,
}: ContactPointCardProps): ReactElement {
  const { t } = useTranslation();

  const fieldErrors: AppConfigFormError[] = getErrorForContactPoint(errors, index);
  const hasError: boolean = fieldErrors.length > 0;

  const handleChangeCategory = (event: ChangeEvent<HTMLInputElement>): void => {
    const updatedContactPoint = { ...contactPoint, category: event.target.value };
    onContactPointsChanged(updatedContactPoint);
  };

  const handleChangeEmail = (event: ChangeEvent<HTMLInputElement>): void => {
    const updatedContactPoint = { ...contactPoint, email: event.target.value };
    onContactPointsChanged(updatedContactPoint);
  };

  const handleChangeTelephone = (event: ChangeEvent<HTMLInputElement>): void => {
    const updatedContactPoint = { ...contactPoint, telephone: event.target.value };
    onContactPointsChanged(updatedContactPoint);
  };

  const handleChangeContactPage = (event: ChangeEvent<HTMLInputElement>): void => {
    const updatedContactPoint = { ...contactPoint, contactPage: event.target.value };
    onContactPointsChanged(updatedContactPoint);
  };

  return (
    <StudioCard id={`${id}-${index}`} data-color='neutral'>
      <StudioFieldset
      // Todo, change to legend={t('')} and description={t('')}
      >
        <StudioFieldset.Legend>
          {t('app_settings.about_tab_contact_point_fieldset_legend', {
            index: index + 1,
          })}
          <StudioTag data-color='warning'>{t('general.required')}</StudioTag>
        </StudioFieldset.Legend>
        <StudioFieldset.Description>
          {t('app_settings.about_tab_contact_point_fieldset_description')}
        </StudioFieldset.Description>
        <StudioTextfield
          label={t('app_settings.about_tab_contact_point_fieldset_category_label')}
          description={t('app_settings.about_tab_contact_point_fieldset_category_description')}
          value={contactPoint.category}
          onChange={handleChangeCategory}
          aria-invalid={hasError}
        />
        <StudioTextfield
          label={t('app_settings.about_tab_contact_point_fieldset_email_label')}
          value={contactPoint.email}
          onChange={handleChangeEmail}
          aria-invalid={hasError}
        />
        <StudioTextfield
          label={t('app_settings.about_tab_contact_point_fieldset_telephone_label')}
          value={contactPoint.telephone}
          onChange={handleChangeTelephone}
          aria-invalid={hasError}
        />
        <StudioTextfield
          label={t('app_settings.about_tab_contact_point_fieldset_contact_page_label')}
          value={contactPoint.contactPage}
          onChange={handleChangeContactPage}
          aria-invalid={hasError}
        />
        <p>fieldErrors: {JSON.stringify(fieldErrors)}</p>
      </StudioFieldset>
    </StudioCard>
  );
}

function getErrorForContactPoint(
  errors: AppConfigFormError[],
  index: number,
): AppConfigFormError[] {
  return errors.filter(
    (error: AppConfigFormError) => isFieldContactPoints(error) && error.index === index,
  );
}

function isFieldContactPoints(error: AppConfigFormError): boolean {
  return error.field === 'contactPoints';
}
