// const InstanceContext = React.createContext<IInstance | null>(null);

// export const InstanceProvider = ({ children }: PropsWithChildren) => {
//   const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
//   const instanceGuid = useNavigationParam('instanceGuid');
//   // const instantiation = useInstantiation();
//
//   const { isLoading: isLoadingProcess, error: _processError } = useProcessQuery();
//
//   const hasPendingScans = useHasPendingScans();
//   const { data } = useInstanceDataQuery({ refetchInterval: hasPendingScans ? 5000 : false });
//
//   console.log('data', data);
//
//   if (!instanceOwnerPartyId || !instanceGuid) {
//     throw new Error('Missing instanceOwnerPartyId or instanceGuid when creating instance context');
//   }
//
//   // const error = instantiation.error ?? instanceDataError ?? processError;
//   // if (error) {
//   //   return <DisplayError error={error} />;
//   // }
//
//   if (!data) {
//     return <Loader reason='loading-instance' />;
//   }
//   if (isLoadingProcess) {
//     return <Loader reason='fetching-process' />;
//   }
//
//   return <InstanceContext.Provider value={data}>{children}</InstanceContext.Provider>;
// };
