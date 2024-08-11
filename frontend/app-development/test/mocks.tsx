import type { ReactNode } from 'react';
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { SharedExtendedRenderOptions } from '@studio/testing/wrapper';
import { SharedProviders } from '@studio/testing/wrapper';
import { AppDevelopmentContextProvider } from 'app-development/contexts/AppDevelopmentContext';

export const textLanguagesMock = ['nb', 'nn', 'en'];

export type AppDevelopmentExtendedRenderOptions = SharedExtendedRenderOptions;

export const AppDevelopmentProviders = ({
  children,
  ...sharedProvidersArgs
}: AppDevelopmentExtendedRenderOptions & { children: ReactNode }) => {
  return (
    <SharedProviders {...sharedProvidersArgs}>
      <AppDevelopmentContextProvider>{children}</AppDevelopmentContextProvider>
    </SharedProviders>
  );
};

export const renderWithProviders = (
  component: ReactNode,
  {
    ...appDevelopmentProvidersArgs
    //...renderOptions
  }: AppDevelopmentExtendedRenderOptions = {},
) => {
  return render(component, {
    wrapper: ({ children }) => (
      <AppDevelopmentProviders {...appDevelopmentProvidersArgs}>{children}</AppDevelopmentProviders>
    ),
    //...renderOptions,
  });
};

export const renderHookWithProviders = <T, P>(
  hook: (props: P) => T,
  {
    ...appDevelopmentProvidersArgs
    //...renderOptions
  }: AppDevelopmentExtendedRenderOptions = {},
) => {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <AppDevelopmentProviders {...appDevelopmentProvidersArgs}>{children}</AppDevelopmentProviders>
    ),
    //...renderOptions,
  });
};

// export const renderWithProviders =
//   (queries: Partial<ServicesContextProps> = {}, queryClient?: QueryClient) =>
//   (component: ReactNode) => {
//     const renderResult = render(
//       <ServicesContextProvider
//         {...queriesMock}
//         {...queries}
//         client={queryClient}
//         clientConfig={queryClientConfigMock}
//       >
//         <PreviewConnectionContextProvider>
//           <BrowserRouter>{component}</BrowserRouter>
//         </PreviewConnectionContextProvider>
//       </ServicesContextProvider>,
//     );
//     const rerender = (rerenderedComponent) =>
//       renderResult.rerender(
//         <ServicesContextProvider
//           {...queriesMock}
//           {...queries}
//           client={queryClient}
//           clientConfig={queryClientConfigMock}
//         >
//           <PreviewConnectionContextProvider>
//             <BrowserRouter>{rerenderedComponent}</BrowserRouter>
//           </PreviewConnectionContextProvider>
//         </ServicesContextProvider>,
//       );
//     return { renderResult: { ...renderResult, rerender } };
//   };

// export const renderHookWithProviders =
//   (queries: Partial<ServicesContextProps> = {}, queryClient?: QueryClient) =>
//   (hook: () => any) => {
//     const renderHookResult = renderHook(hook, {
//       wrapper: ({ children }) => (
//         <ServicesContextProvider
//           {...queriesMock}
//           {...queries}
//           client={queryClient}
//           clientConfig={queryClientConfigMock}
//         >
//           <PreviewConnectionContextProvider>{children}</PreviewConnectionContextProvider>
//         </ServicesContextProvider>
//       ),
//     });
//     return { renderHookResult };
//   };
