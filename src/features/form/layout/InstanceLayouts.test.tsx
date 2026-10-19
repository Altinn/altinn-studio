import React from 'react';

import { jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { useLayouts } from 'src/features/form/layout/LayoutsContext';
import { useRawPageOrder } from 'src/features/form/layoutSettings/LayoutSettingsContext';
import { fetchApplicationMetadata, fetchInstanceData } from 'src/queries/queries';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';

const instanceA = '512345/75154373-aed4-41f7-95b4-e5b5115c2edc';
const instanceB = '512345/0fc385c1-3c7b-41e3-884a-b43126c988a9';

function pageNameFor(instanceId: string) {
  return `page-${instanceId.split('/')[1]}`;
}

function LayoutsAndPageOrder() {
  const layouts = useLayouts();
  const order = useRawPageOrder();
  return (
    <>
      <p data-testid='layouts'>{Object.keys(layouts).join(',')}</p>
      <p data-testid='order'>{order.join(',')}</p>
    </>
  );
}

function mockInstanceLayoutsFeature(enabled: boolean | undefined) {
  jest.mocked(fetchApplicationMetadata).mockImplementation(async () =>
    getIncomingApplicationMetadataMock((a) => {
      const { addInstanceIdentifierToLayoutRequests: _, ...features } = a.features ?? {};
      a.features = enabled === undefined ? features : { ...features, addInstanceIdentifierToLayoutRequests: enabled };
    }),
  );
}

beforeEach(() => {
  jest.mocked(fetchInstanceData).mockClear();
  jest.mocked(fetchInstanceData).mockImplementation(async (partyId, instanceGuid) =>
    getInstanceDataMock((i) => {
      i.id = `${partyId}/${instanceGuid}`;
    }),
  );
});

describe('Layouts with addInstanceIdentifierToLayoutRequests', () => {
  beforeEach(() => mockInstanceLayoutsFeature(true));

  it('fetches layouts and settings again when navigating to another instance', async () => {
    const { queries, routerRef } = await renderWithInstanceAndLayout({
      renderer: () => <LayoutsAndPageOrder />,
      instanceId: instanceA,
      initialPage: pageNameFor(instanceA),
      queries: {
        fetchLayoutsForInstance: async (_layoutSetId, instanceId) => ({
          [pageNameFor(instanceId)]: { data: { layout: [] } },
        }),
        fetchLayoutSettingsForInstance: async (_layoutSetId, instanceId) => ({
          pages: { order: [pageNameFor(instanceId)] },
        }),
      },
    });

    expect(screen.getByTestId('layouts')).toHaveTextContent(pageNameFor(instanceA));
    expect(screen.getByTestId('order')).toHaveTextContent(pageNameFor(instanceA));
    expect(queries.fetchLayouts).not.toHaveBeenCalled();
    expect(queries.fetchLayoutSettings).not.toHaveBeenCalled();

    await routerRef.current!.navigate(`/instance/${instanceB}/Task_1/${pageNameFor(instanceB)}`);

    await waitFor(() => expect(screen.getByTestId('layouts')).toHaveTextContent(pageNameFor(instanceB)));
    expect(screen.getByTestId('order')).toHaveTextContent(pageNameFor(instanceB));
    expect(queries.fetchLayoutsForInstance).toHaveBeenCalledWith(expect.any(String), instanceB);
    expect(queries.fetchLayoutSettingsForInstance).toHaveBeenCalledWith(expect.any(String), instanceB);
  });
});

describe('Layouts without addInstanceIdentifierToLayoutRequests', () => {
  const regularPage = 'regular-page';

  it.each([
    { feature: 'missing', enabled: undefined },
    { feature: 'false', enabled: false },
  ])('only uses the regular endpoints when the feature is $feature', async ({ enabled }) => {
    mockInstanceLayoutsFeature(enabled);
    const { queries, routerRef } = await renderWithInstanceAndLayout({
      renderer: () => <LayoutsAndPageOrder />,
      instanceId: instanceA,
      initialPage: regularPage,
      queries: {
        fetchLayouts: async () => ({ [regularPage]: { data: { layout: [] } } }),
        fetchLayoutSettings: async () => ({ pages: { order: [regularPage] } }),
      },
    });

    expect(screen.getByTestId('layouts')).toHaveTextContent(regularPage);
    expect(screen.getByTestId('order')).toHaveTextContent(regularPage);

    await routerRef.current!.navigate(`/instance/${instanceB}/Task_1/${regularPage}`);
    await waitFor(() => {
      expect(fetchInstanceData).toHaveBeenCalledWith(...instanceB.split('/'));
      expect(screen.getByTestId('layouts')).toHaveTextContent(regularPage);
    });
    expect(queries.fetchLayouts).toHaveBeenCalled();
    expect(queries.fetchLayoutSettings).toHaveBeenCalled();
    expect(queries.fetchLayoutsForInstance).not.toHaveBeenCalled();
    expect(queries.fetchLayoutSettingsForInstance).not.toHaveBeenCalled();
  });
});
