import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { User } from '../../resources/fetchDashboardResources/dashboardSlice';
import { AltinnSpinner } from 'app-shared/components';
import type { IGiteaOrganisation } from 'app-shared/types/global';
import { AltinnPopper } from 'app-shared/components/AltinnPopper';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useGetOrganizationsQuery } from '../../services/organizationApi';
import { useAppSelector } from '../../common/hooks';
import { Select } from '@digdir/design-system-react';

const zIndex = {
  zIndex: 1300,
};

interface IServiceOwnerSelectorProps {
  onServiceOwnerChanged: (newValue: string) => void;
  errorMessage?: string;
  selectedOrgOrUser: string;
}

interface ICombineCurrentUserAndOrg {
  user: User;
  organisations: IGiteaOrganisation[];
}

const combineCurrentUserAndOrg = ({ organisations = [], user }: ICombineCurrentUserAndOrg) => {
  const allUsers = organisations.map((props: any) => {
    return {
      value: props.username,
      label: props.full_name || props.username,
    };
  });

  allUsers.push({
    value: user.login,
    label: user.full_name || user.login,
  });

  return allUsers;
};

export const ServiceOwnerSelector = ({
  onServiceOwnerChanged,
  errorMessage,
  selectedOrgOrUser,
}: IServiceOwnerSelectorProps) => {
  const { data: organisations, isLoading: isLoadingOrganisations } = useGetOrganizationsQuery();

  const user = useAppSelector((state) => state.dashboard.user);
  const language = useAppSelector((state) => state.language.language);

  const serviceOwnerRef = useRef(null);

  const selectableOrgsOrUser = useMemo(() => {
    return combineCurrentUserAndOrg({
      organisations,
      user,
    });
  }, [organisations, user]);

  useEffect(() => {
    if (isLoadingOrganisations === false && selectableOrgsOrUser.length === 1) {
      onServiceOwnerChanged(selectableOrgsOrUser[0].value); // auto-select the option when theres only 1 option
    }
  }, [selectableOrgsOrUser, onServiceOwnerChanged, isLoadingOrganisations]);

  useLayoutEffect(() => {
    serviceOwnerRef.current = document.querySelector('#service-owner');
  });

  const handleChange = (value: string) => onServiceOwnerChanged(value);
  const value =
    selectableOrgsOrUser.length === 1 ? selectableOrgsOrUser[0].value : selectedOrgOrUser;
  return isLoadingOrganisations ? (
    <AltinnSpinner spinnerText={getLanguageFromKey('dashboard.loading', language)} />
  ) : (
    <div>
      <Select
        inputId='service-owner'
        label={getLanguageFromKey('general.service_owner', language)}
        onChange={handleChange}
        options={selectableOrgsOrUser}
        value={value}
        disabled={selectableOrgsOrUser.length === 1}
      />
      {errorMessage && (
        <AltinnPopper anchorEl={serviceOwnerRef.current} message={errorMessage} styleObj={zIndex} />
      )}
    </div>
  );
};
