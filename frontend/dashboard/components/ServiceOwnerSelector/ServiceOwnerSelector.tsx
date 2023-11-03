import React from 'react';
import { Label, Select } from '@digdir/design-system-react';
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

  const selectableUser: SelectableItem = mapUserToSelectableItem(user);
  const selectableOrganizations: SelectableItem[] = mapOrganizationToSelectableItems(organizations);
  const selectableOptions: SelectableItem[] = [selectableUser, ...selectableOrganizations];

  const defaultValue: string =
    selectableOptions.length === 1 ? selectableOptions[0].value : selectedOrgOrUser;

  const hasError: boolean = !!errorMessage;

  return (
    <div>
      <Label spacing htmlFor='service-owner'>
        {t('general.service_owner')}
      </Label>
      <Select
        hideLabel
        error={hasError}
        inputId='service-owner'
        // inputName={name} TODO should be added when the new version of digdir designsystem is released
        options={selectableOptions}
        value={defaultValue}
      />
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
