import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { typedLocalStorage } from '@studio/pure-functions';
import { PageHeader } from 'app-shared/components/PageHeader/PageHeader';
import { useUserQuery } from 'app-shared/hooks/queries';
import { LocalStorageKey } from 'app-shared/enums/LocalStorageKey';

export const PageLayout = () => {
  const { data: user } = useUserQuery();
  const [owner, setOwner] = useState<string | undefined>(
    typedLocalStorage.getItem<string>(LocalStorageKey.StudioRootOwner) ?? user?.login,
  );

  useEffect(() => {
    if (!user?.login) {
      setOwner(undefined);
      return;
    }

    const storedOwner = typedLocalStorage.getItem<string>(LocalStorageKey.StudioRootOwner);
    setOwner((previousOwner) => previousOwner ?? storedOwner ?? user.login);
  }, [user?.login]);

  const setSelectedOwner = (selectedOwner: string) => {
    setOwner(selectedOwner);
    typedLocalStorage.setItem(LocalStorageKey.StudioRootOwner, selectedOwner);
  };

  return (
    <>
      {owner && (
        <PageHeader
          owner={owner}
          onOrgSelect={(org) => setSelectedOwner(org.username)}
          onUserSelect={(selectedUser) => setSelectedOwner(selectedUser.login)}
        />
      )}
      <Outlet />
    </>
  );
};
