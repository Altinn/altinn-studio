import { useOrganizationsQuery } from './queries/useOrganizationsQuery';

export const useIsOrganizationRepo = (owner: string): boolean => {
  const { data: organizations } = useOrganizationsQuery();
  return organizations?.some((organization) => organization.username === owner) ?? false;
};
