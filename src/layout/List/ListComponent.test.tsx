import React from 'react';

import { jest } from '@jest/globals';
import { act, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import * as useDeviceWidths from 'src/hooks/useDeviceWidths';
import { ListComponent } from 'src/layout/List/ListComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import type { JsonPatch } from 'src/features/formData/jsonPatch/types';
import type { doPatchFormData } from 'src/queries/queries';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

const paginationData = { alternatives: [2, 5], default: 2 };
const countries = [
  {
    Name: 'Norway',
    Population: 5,
    HighestMountain: 2469,
    FlagLink: '[Norwegian flag](https://www.worldometers.info/img/flags/no-flag.gif)',
  },
  {
    Name: 'Sweden',
    Population: 10,
    HighestMountain: 1738,
    FlagLink: '[Swedish flag](https://www.worldometers.info/img/flags/sw-flag.gif)',
  },
  {
    Name: 'Denmark',
    Population: 6,
    HighestMountain: 170,
    FlagLink: '[Danish flag](https://www.worldometers.info/img/flags/da-flag.gif)',
  },
  {
    Name: 'Germany',
    Population: 83,
    HighestMountain: 2962,
    FlagLink: '[German flag](https://www.worldometers.info/img/flags/gm-flag.gif)',
  },
  {
    Name: 'Spain',
    Population: 47,
    HighestMountain: 3718,
    FlagLink: '[Spanish flag](https://www.worldometers.info/img/flags/sp-flag.gif)',
  },
  {
    Name: 'France',
    Population: 67,
    HighestMountain: 4807,
    FlagLink: '[French flag](https://www.worldometers.info/img/flags/fr-flag.gif)',
  },
];

function RenderCounter({ node }: { node: LayoutNode<'List'> }) {
  const renderCount = React.useRef(0);
  const dataModelBindings = useDataModelBindingsFor(node.baseId, 'List');

  // This simulates the List component data model fetching. It will trigger a re-render of the component once every
  // time any of the data model bindings change.
  useDataModelBindings(dataModelBindings);

  renderCount.current++;

  return <div data-testid='render-count'>{renderCount.current}</div>;
}

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'List'>> = {}) =>
  await renderGenericComponentTest({
    type: 'List',
    renderer: (props) => (
      <>
        <ListComponent {...props} />
        <RenderCounter node={props.node} />
      </>
    ),
    component: {
      id: 'list-component-id',
      tableHeaders: {
        Name: 'Name',
        Population: 'Population',
        HighestMountain: 'HighestMountain',
        FlagLink: 'FlagLink',
      },
      dataModelBindings: {
        Name: { dataType: defaultDataTypeMock, field: 'CountryName' },
        Population: { dataType: defaultDataTypeMock, field: 'CountryPopulation' },
        HighestMountain: { dataType: defaultDataTypeMock, field: 'CountryHighestMountain' },
      },
      sortableColumns: ['population', 'highestMountain'],
      pagination: paginationData,
      dataListId: 'countries',
      ...component,
    },
    queries: {
      fetchDataModelSchema: async () => ({
        type: 'object',
        properties: {
          CountryName: {
            type: 'string',
          },
          CountryPopulation: {
            type: 'number',
          },
          CountryHighestMountain: {
            type: 'number',
          },
        },
      }),
      fetchDataList: async () => ({
        listItems: countries,
        _metaData: {
          page: 0,
          pageCount: 1,
          pageSize: 5,
          totaltItemsCount: 6,
          links: [],
        },
      }),
      ...rest.queries,
    },
    ...rest,
  });

describe('ListComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should render rows that is sent in but not rows that is not sent in', async () => {
    await render();

    expect(await screen.findByText('Norway')).toBeInTheDocument();
    expect(screen.getByText('Sweden')).toBeInTheDocument();
    expect(screen.queryByText('Italy')).not.toBeInTheDocument();
  });

  it('should render columns as markup', async () => {
    await render();
    expect(await screen.findByRole('link', { name: /Norwegian flag/ })).toBeInTheDocument();
  });

  it('should save all field values in dataModelBindings atomically', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    const { formDataMethods, mutations } = await render();

    // There should be one radio for each country, but none of them should be checked
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
    expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument();

    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Select the second row
    const swedishRow = screen.getByRole('row', { name: /sweden/i });
    await user.click(swedishRow);

    expect(formDataMethods.setMultiLeafValues).toHaveBeenCalledWith({
      debounceTimeout: undefined,
      changes: [
        { reference: { field: 'CountryName', dataType: defaultDataTypeMock }, newValue: 'Sweden' },
        { reference: { field: 'CountryPopulation', dataType: defaultDataTypeMock }, newValue: 10 },
        { reference: { field: 'CountryHighestMountain', dataType: defaultDataTypeMock }, newValue: 1738 },
      ],
    });
    expect(screen.getByTestId('render-count')).toHaveTextContent('2');

    // // Select the third row
    const danishRow = screen.getByRole('row', { name: /denmark/i });
    await user.click(danishRow);
    expect(formDataMethods.setMultiLeafValues).toHaveBeenCalledWith({
      debounceTimeout: undefined,
      changes: [
        { reference: { field: 'CountryName', dataType: defaultDataTypeMock }, newValue: 'Denmark' },
        { reference: { field: 'CountryPopulation', dataType: defaultDataTypeMock }, newValue: 6 },
        { reference: { field: 'CountryHighestMountain', dataType: defaultDataTypeMock }, newValue: 170 },
      ],
    });
    expect(screen.getByTestId('render-count')).toHaveTextContent('3');

    // Wait until the debounce timeout has definitely passed, then expect the form data to be saved. It should only
    // be saved once (even though we changed the value twice) because the debouncing happens globally.
    act(() => jest.advanceTimersByTime(2000));
    await waitFor(() => expect(mutations.doPatchFormData.mock).toHaveBeenCalledTimes(1));

    const mockedArgs = (mutations.doPatchFormData.mock as jest.Mock).mock.calls[0] as unknown as Parameters<
      typeof doPatchFormData
    >;
    const patch: JsonPatch = mockedArgs[1].patch;
    expect(patch).toEqual([
      { op: 'add', path: '/CountryName', value: 'Denmark' },
      { op: 'add', path: '/CountryPopulation', value: 6 },
      { op: 'add', path: '/CountryHighestMountain', value: 170 },
    ]);
  });

  it('should save all field values when in mobile', async () => {
    jest.useFakeTimers();
    jest.spyOn(useDeviceWidths, 'useIsMobile').mockReturnValue(true);

    const user = userEvent.setup({ delay: null });
    const { formDataMethods } = await render({ component: { tableHeadersMobile: ['Name', 'FlagLink'] } });

    // Make sure test is not broken by changing mobile-view implementation
    expect(useDeviceWidths.useIsMobile).toHaveBeenCalled();

    // There should be one radio for each country, but none of them should be checked
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(6));
    expect(screen.queryByRole('radio', { checked: true })).not.toBeInTheDocument();

    // Select the second row
    const swedishRow = screen.getByRole('radio', { name: /sweden/i });
    await user.click(swedishRow);

    expect(formDataMethods.setMultiLeafValues).toHaveBeenCalledWith({
      debounceTimeout: undefined,
      changes: [
        { reference: { field: 'CountryName', dataType: defaultDataTypeMock }, newValue: 'Sweden' },
        { reference: { field: 'CountryPopulation', dataType: defaultDataTypeMock }, newValue: 10 },
        { reference: { field: 'CountryHighestMountain', dataType: defaultDataTypeMock }, newValue: 1738 },
      ],
    });
  });
});
