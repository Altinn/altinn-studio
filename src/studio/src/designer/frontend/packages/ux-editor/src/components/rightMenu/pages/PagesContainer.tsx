import React from 'react';
import { useSelector } from 'react-redux';
import { PageElement } from './PageElement';
import type { IAppState } from '../../../types/global';

export default function PagesContainer() {
  const layoutOrder: string[] = useSelector(
    (state: IAppState) => state.formDesigner.layout.layoutSettings.pages.order
  );

  return (
    <>
      {layoutOrder.map((layout: string) => (
        <PageElement name={layout} key={layout} />
      ))}
    </>
  );
}
