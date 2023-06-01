import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { deepCopy } from 'app-shared/pure';
import { PageElement } from './PageElement';
import type { IAppState } from '../../types/global';
import { useParams, useSearchParams } from 'react-router-dom';
import { useFormLayoutSettingsQuery } from '../../hooks/queries/useFormLayoutSettingsQuery';
import { useAddLayoutMutation } from '../../hooks/mutations/useAddLayoutMutation';
import { useText } from '../../hooks';
import { selectedLayoutSetSelector } from "../../selectors/formLayoutSelectors";

export function PagesContainer() {
  const { org, app } = useParams();
  const t = useText();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const formLayoutSettingsQuery = useFormLayoutSettingsQuery(org, app, selectedLayoutSet);
  const addLayoutMutation = useAddLayoutMutation(org, app, selectedLayoutSet);
  const layoutOrder = formLayoutSettingsQuery.data.pages.order;
  const invalidLayouts: string[] = useSelector(
    (state: IAppState) => state.formDesigner.layout.invalidLayouts
  );

  useEffect((): void => {
    if (!layoutOrder?.length) {
      const layoutName = `${t('general.page')}1`;
      if (!addLayoutMutation.isLoading) {
        addLayoutMutation.mutate({ layoutName, isReceiptPage: false });
        setSearchParams({ ...deepCopy(searchParams), layout: layoutName });
      }
    }
  }, [layoutOrder, addLayoutMutation, t, searchParams, setSearchParams]);

  return (
    <>
      {layoutOrder.map((layout: string) => {
        const invalid = invalidLayouts.includes(layout);
        return <PageElement name={layout} key={layout} invalid={invalid} />;
      })}
    </>
  );
}
