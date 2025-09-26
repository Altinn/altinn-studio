//
// function profileQueryOptions(enabled: boolean) {
//   return queryOptions<IProfile | null>({
//     queryKey: ['fetchUserProfile', enabled],
//     queryFn: fetchUserProfile,
//     enabled,
//     placeholderData: null,
//   });
// }
//
// const canHandleProfileQueryError = (error: UseQueryResult<IProfile | undefined>['error']) =>
//   // The backend will return 400 if the logged in user/client is not a user.
//   // Altinn users have profiles, but organisations, service owners and system users do not, so this is expected
//   isAxiosError(error) && error.response?.status === 400;
//
// export const useProfileQuery = () => {
//   const enabled = useShouldFetchProfile();
//   const query = useQuery(profileQueryOptions(enabled));
//
//   const shouldReturnNull = !enabled || (query.isError && canHandleProfileQueryError(query.error));
//
//   return {
//     ...query,
//     data: shouldReturnNull ? null : query.data,
//     enabled,
//   };
// };
//
// const { Provider, useCtx } = delayedContext(() =>
//   createQueryContext<IProfile | null, false>({
//     name: 'Profile',
//     required: false,
//     default: null,
//     shouldDisplayError: (error) => !canHandleProfileQueryError(error),
//     query: useProfileQuery,
//   }),
// );

// @ts-ignore
console.log(window.AltinnAppData);

// export const ProfileProvider = Provider;
// @ts-ignore
export const useProfile = () => window.AltinnAppData.profile;
//export const useShouldFetchProfile = () => useIsAllowAnonymous(false);
