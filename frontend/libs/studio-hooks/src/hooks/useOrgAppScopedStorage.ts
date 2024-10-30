import { useParams } from 'react-router-dom';
import {
  type ScopedStorage,
  type ScopedStorageResult,
  ScopedStorageImpl,
} from '@studio/pure-functions';

type OrgAppParams = {
  org: string;
  app: string;
};

const supportedStorageMap: Record<UseOrgAppScopedStorage['storage'], ScopedStorage> = {
  localStorage: window.localStorage,
  sessionStorage: window.sessionStorage,
};

export type UseOrgAppScopedStorage = {
  storage?: 'localStorage' | 'sessionStorage';
};

type UseOrgAppScopedStorageResult = ScopedStorageResult;
export const useOrgAppScopedStorage = ({
  storage = 'localStorage',
}: UseOrgAppScopedStorage): UseOrgAppScopedStorageResult => {
  const { org, app } = useParams<OrgAppParams>();

  const storageKey: string = `${org}-${app}`;
  const scopedStorage = new ScopedStorageImpl(supportedStorageMap[storage], storageKey);

  return {
    setItem: scopedStorage.setItem,
    getItem: scopedStorage.getItem,
    removeItem: scopedStorage.removeItem,
  };
};
