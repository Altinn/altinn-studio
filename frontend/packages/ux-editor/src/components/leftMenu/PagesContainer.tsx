import React from 'react';
import { useSelector } from 'react-redux';
import { PageElement } from './PageElement';
import type { IAppState } from '../../types/global';
import { useParams } from 'react-router-dom';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';

export function PagesContainer() {
  const { org, app } = useParams();
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app);
  const layoutOrder = formLayoutSettingsQuery.data.pages.order;
  const invalidLayouts: string[] = useSelector(
    (state: IAppState) => state.formDesigner.layout.invalidLayouts
  );

  return (
    <>
      {layoutOrder.map((layout: string) => {
        const invalid = invalidLayouts.includes(layout);
        return <PageElement name={layout} key={layout} invalid={invalid} />;
      })}
    </>
  );
}
