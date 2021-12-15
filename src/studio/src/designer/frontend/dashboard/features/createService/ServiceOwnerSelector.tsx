import * as React from 'react';

import { User } from '../../resources/fetchDashboardResources/dashboardSlice';

import AltinnSpinner from 'app-shared/components/AltinnSpinner';
import { IGiteaOrganisation } from 'app-shared/types';
import AltinnDropdown from 'app-shared/components/AltinnDropdown';
import AltinnPopper from 'app-shared/components/AltinnPopper';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { useGetOrganizationsQuery } from 'services/organizationApi';

import { useAppSelector } from 'common/hooks';

const zIndex = {
  zIndex: 1300,
};

type ServiceOwnerSelectorProps = {
  onServiceOwnerChanged: (newValue: string) => void;
  errorMessage?: string;
  selectedOrgOrUser: string;
};

type CombineCurrentUserAndOrg = {
  user: User;
  organisations: IGiteaOrganisation[];
};

const combineCurrentUserAndOrg = ({
  organisations = [],
  user,
}: CombineCurrentUserAndOrg) => {
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
}: ServiceOwnerSelectorProps) => {
  const { data: organisations, isLoading: isLoadingOrganisations } =
    useGetOrganizationsQuery();

  const user = useAppSelector((state) => state.dashboard.user);
  const language = useAppSelector((state) => state.language.language);

  const serviceOwnerRef = React.useRef(null);

  const selectableOrgsOrUser = React.useMemo(() => {
    return combineCurrentUserAndOrg({
      organisations,
      user,
    });
  }, [organisations, user]);

  React.useEffect(() => {
    if (isLoadingOrganisations === false && selectableOrgsOrUser.length === 1) {
      onServiceOwnerChanged(selectableOrgsOrUser[0].label); // auto-select the option when theres only 1 option
    }
  }, [selectableOrgsOrUser, onServiceOwnerChanged, isLoadingOrganisations]);

  React.useLayoutEffect(() => {
    serviceOwnerRef.current = document.querySelector('#service-owner');
  });

  const handleChange = ({ target }: { target: HTMLInputElement }) => {
    onServiceOwnerChanged(target.value);
  };

  if (isLoadingOrganisations) {
    return (
      <AltinnSpinner
        spinnerText={getLanguageFromKey('dashboard.loading', language)}
      />
    );
  }

  return (
    <div>
      <AltinnDropdown
        id='service-owner'
        inputHeader={getLanguageFromKey('general.service_owner', language)}
        handleChange={handleChange}
        dropdownItems={selectableOrgsOrUser}
        selectedValue={selectedOrgOrUser}
        disabled={selectableOrgsOrUser.length === 1}
        fullWidth={true}
      />
      {errorMessage && (
        <AltinnPopper
          anchorEl={serviceOwnerRef.current}
          message={errorMessage}
          styleObj={zIndex}
        />
      )}
    </div>
  );
};
