import type { ReactNode } from 'react';
import type { LayoutProps } from '@altinn/altinn-components';
import { Layout, RootProvider } from '@altinn/altinn-components';
import '@altinn/altinn-components/dist/global.css';

export type StudioLayoutLanguageCode = 'nb' | 'nn' | 'en';

export interface StudioLayoutProps extends LayoutProps {
  languageCode?: StudioLayoutLanguageCode;
  children?: ReactNode;
}

export const StudioLayout = ({ languageCode = 'nb', children, ...layoutProps }: StudioLayoutProps) => {
  return (
    <RootProvider languageCode={languageCode}>
      <Layout {...layoutProps}>{children}</Layout>
    </RootProvider>
  );
};
