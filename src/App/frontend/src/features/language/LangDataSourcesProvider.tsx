// export type LimitedTextResourceVariablesDataSources = Omit<
//   TextResourceVariablesDataSources,
//   'node' | 'defaultDataType' | 'formDataTypes' | 'formDataSelector' | 'transposeSelector'
// >;
// export interface LangDataSources extends LimitedTextResourceVariablesDataSources {
//   textResources: TextResourceMap;
//   selectedLanguage: string;
//   language: FixedLanguageList;
// }
//
// interface Context {
//   dataSources: LangDataSources | undefined;
//   setDataSources: React.Dispatch<React.SetStateAction<LangDataSources | undefined>>;
// }

// const { Provider, useCtx } = createContext<Context>({
//   name: 'LangDataSourcesProvider',
//   required: true,
// });

// export const LangDataSourcesProvider = ({ children }: PropsWithChildren) => {
//   const textResources = useTextResources();
//   const selectedAppLanguage = useCurrentLanguage();
//   const dataModels = useDataModelReaders();
//   const applicationSettings = useLaxApplicationSettings();
//   const instanceDataSources = useInstanceDataSources();
//   const [dataSources, setDataSources] = useStateDeepEqual<LangDataSources | undefined>(undefined);
//
//   // This LangDataSourcesProvider is re-rendered very often, and will always 'move' around in the DOM tree wherever
//   // RenderStart is rendered. This means that we cannot rely on the memoization of the data sources, as the hooks
//   // will all run as if they were new hooks. That's why we take extra care to only update the data sources if
//   // something has changed.
//   useEffect(() => {
//     setDataSources((prev) => {
//       if (
//         prev?.selectedLanguage === selectedAppLanguage &&
//         prev?.textResources === textResources &&
//         prev?.dataModels === dataModels &&
//         prev?.applicationSettings === applicationSettings &&
//         prev?.instanceDataSources === instanceDataSources
//       ) {
//         return prev;
//       }
//
//       return {
//         textResources,
//         language: getLanguageFromCode(selectedAppLanguage),
//         selectedLanguage: selectedAppLanguage,
//         dataModels,
//         applicationSettings,
//         instanceDataSources,
//         customTextParameters: null,
//         dataSources,
//       };
//     });
//   }, [
//     textResources,
//     selectedAppLanguage,
//     dataModels,
//     applicationSettings,
//     instanceDataSources,
//     setDataSources,
//     dataSources,
//   ]);
//
//   if (!dataSources) {
//     // We cannot render <Loader /> here, as that would lead to an infinite loop
//     return null;
//   }
//
//   return (
//     <Provider
//       value={{
//         dataSources,
//         setDataSources,
//       }}
//     >
//       {children}
//     </Provider>
//   );
// };

//export const useLangToolsDataSources = () => useCtx().dataSources;
