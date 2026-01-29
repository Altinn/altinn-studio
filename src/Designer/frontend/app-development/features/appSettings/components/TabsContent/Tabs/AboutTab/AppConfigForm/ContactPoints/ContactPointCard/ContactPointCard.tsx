import React from 'react';
import type { ChangeEvent, ReactElement } from 'react';
import classes from './ContactPointCard.module.css';
import type { ContactPoint } from 'app-shared/types/AppConfig';
import {
  StudioCard,
  StudioDeleteButton,
  StudioFieldset,
  StudioTag,
  StudioTextfield,
} from '@studio/components';
import { useTranslation } from 'react-i18next';

export type ContactPointCardProps = {
  contactPoint: ContactPoint;
  onContactPointsChanged: (contactPoint: ContactPoint) => void;
  index: number;
  id: string;
  onRemoveButtonClick?: (contactPoint: ContactPoint) => void;
};

export function ContactPointCard({
  contactPoint,
  onContactPointsChanged,
  index,
  id,
  onRemoveButtonClick,
}: ContactPointCardProps): ReactElement {
  const { t } = useTranslation();

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
    <StudioCard data-color='neutral' id={id}>
      <StudioFieldset
        legend={<FieldsetWithTag cardNumber={index + 1} />}
        description={t('app_settings.about_tab_contact_point_fieldset_description')}
      >
        <StudioTextfield
          label={t('app_settings.about_tab_contact_point_fieldset_category_label')}
          description={t('app_settings.about_tab_contact_point_fieldset_category_description')}
          value={contactPoint.category}
          onChange={handleChangeCategory}
        />
        <StudioTextfield
          label={t('app_settings.about_tab_contact_point_fieldset_email_label')}
          value={contactPoint.email}
          onChange={handleChangeEmail}
        />
        <StudioTextfield
          label={t('app_settings.about_tab_contact_point_fieldset_telephone_label')}
          value={contactPoint.telephone}
          onChange={handleChangeTelephone}
        />
        <StudioTextfield
          label={t('app_settings.about_tab_contact_point_fieldset_contact_page_label')}
          value={contactPoint.contactPage}
          onChange={handleChangeContactPage}
        />
        {onRemoveButtonClick && (
          <StudioDeleteButton
            onDelete={() => onRemoveButtonClick(contactPoint)}
            confirmMessage={t('app_settings.about_tab_contact_point_delete_confirm')}
          >
            {t('app_settings.about_tab_contact_point_delete_button_text', { index: index + 1 })}
          </StudioDeleteButton>
        )}
      </StudioFieldset>
    </StudioCard>
  );
}

type FieldsetWithTagProps = {
  cardNumber: number;
};

function FieldsetWithTag({ cardNumber }: FieldsetWithTagProps): ReactElement {
  const { t } = useTranslation();
  return (
    <span className={classes.fieldsetLegend}>
      {t('app_settings.about_tab_contact_point_fieldset_legend', {
        index: cardNumber,
      })}
      <StudioTag data-color='warning'>{t('general.required')}</StudioTag>
    </span>
  );
}
