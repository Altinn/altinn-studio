import type { ReactNode } from 'react';
import React from 'react';
import { render, renderHook } from '@testing-library/react';
import type { ILayoutSettings } from 'app-shared/types/global';
import { layout1NameMock, layout2NameMock } from './layoutMock';
import type { AppContextProps } from '../AppContext';
import { AppContext } from '../AppContext';
import { appContextMock } from './appContextMock';
import type { AppDevelopmentExtendedRenderOptions } from 'app-development/test/mocks';
import { AppDevelopmentProviders } from 'app-development/test/mocks';

export const formLayoutSettingsMock: ILayoutSettings = {
  pages: {
    order: [layout1NameMock, layout2NameMock],
  },
};

export const textLanguagesMock = ['nb', 'nn', 'en'];

export const optionListIdsMock: string[] = ['test-1', 'test-2'];

export type UxEditorExtendedRenderOptions = AppDevelopmentExtendedRenderOptions & {
  appContextProps?: Partial<AppContextProps>;
};

export const UxEditorProviders = ({
  children,
  appContextProps = {},
  ...appDevelopementProvidersArgs
}: UxEditorExtendedRenderOptions & { children: ReactNode }) => {
  return (
    <AppDevelopmentProviders {...appDevelopementProvidersArgs}>
      <AppContext.Provider value={{ ...appContextMock, ...appContextProps }}>
        {children}
      </AppContext.Provider>
    </AppDevelopmentProviders>
  );
};

export const renderWithProviders = (
  component: ReactNode,
  {
    ...uxEditorProvidersArgs
    //...renderOptions
  }: UxEditorExtendedRenderOptions = {},
) => {
  return render(component, {
    wrapper: ({ children }) => (
      <UxEditorProviders {...uxEditorProvidersArgs}>{children}</UxEditorProviders>
    ),
    //...renderOptions,
  });
};

export const renderHookWithProviders = (
  hook: () => any,
  {
    ...uxEditorProvidersArgs
    //...renderOptions
  }: UxEditorExtendedRenderOptions = {},
) => {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <UxEditorProviders {...uxEditorProvidersArgs}>{children}</UxEditorProviders>
    ),
    //...renderOptions,
  });
};
