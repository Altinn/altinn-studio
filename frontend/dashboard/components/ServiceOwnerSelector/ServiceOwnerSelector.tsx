import React, { useId } from 'react';
import { ErrorMessage, Label, Select } from '@digdir/design-system-react';
import { useTranslation } from 'react-i18next';
import { Organization } from 'app-shared/types/Organization';
import { User } from 'app-shared/types/User';

type ServiceOwnerSelectorProps = {
  selectedOrgOrUser: string;
  user: User;
  organizations: Organization[];
  errorMessage?: string;
  name?: string;
};

export const ServiceOwnerSelector = ({
  selectedOrgOrUser,
  user,
  organizations,
  errorMessage,
  name,
}: ServiceOwnerSelectorProps) => {
  const { t } = useTranslation();
  const serviceOwnerId: stirng = useId();
  const serviceOwnerErrorId: string = `error-message-${serviceOwnerId}`;

  const selectableUser: SelectableItem = mapUserToSelectableItem(user);
  const selectableOrganizations: SelectableItem[] = mapOrganizationToSelectableItems(organizations);
  const selectableOptions: SelectableItem[] = [selectableUser, ...selectableOrganizations];

  const defaultValue: string =
    selectableOptions.length === 1 ? selectableOptions[0].value : selectedOrgOrUser;

  const hasError: boolean = !!errorMessage;

  return (
    <div>
      <Label spacing htmlFor={serviceOwnerId}>
        {t('general.service_owner')}
      </Label>
      <Select
        hideLabel
        error={hasError}
        inputId={serviceOwnerId}
        inputName={name}
        options={selectableOptions}
        value={defaultValue}
        aria-describedby={hasError ? serviceOwnerErrorId : undefined}
      />
      <ErrorMessage id={serviceOwnerErrorId}>{errorMessage}</ErrorMessage>
    </div>
  );
};

type SelectableItem = {
  value: string;
  label: string;
};
const mapOrganizationToSelectableItems = (organizations: Organization[]): SelectableItem[] => {
  return organizations.map(
    ({ username, full_name }): SelectableItem => ({
      value: username,
      label: full_name || username,
    }),
  );
};

const mapUserToSelectableItem = (user: User): SelectableItem => {
  return {
    value: user.login,
    label: user.full_name || user.login,
  };
};
