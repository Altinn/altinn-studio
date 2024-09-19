import React from 'react';
import { useRouterContext } from '../contexts/RouterContext';
import { Root } from './Root';
import { CodeList } from './CodeList';

type RouterPageProps = {
  pages: any;
};

export const RouterPage = ({ pages }: RouterPageProps) => {
  const { currentPage } = useRouterContext();
  // TODO fix typing
  const pageMap = new Map<string, (props: any) => React.JSX.Element>();

  // TODO move logic for mapping configured pages
  Object.keys(pages).forEach((page) => {
    if (page === 'root') {
      pageMap.set('root', Root);
    }

    if (page === 'codeList') {
      pageMap.set('codeList', CodeList);
    }
  });

  const Component = pageMap.get(currentPage);

  if (!Component) return <h1>404 Page Not Found</h1>;

  const componentProps = pages[currentPage].props;
  return <Component {...componentProps} />;
};
