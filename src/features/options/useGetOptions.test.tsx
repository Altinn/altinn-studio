import React from 'react';

import { jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { AxiosResponse } from 'axios';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { useGetOptions } from 'src/features/options/useGetOptions';
import { renderWithNode } from 'src/test/renderWithProviders';
import type { ExprVal, ExprValToActualOrExpr } from 'src/features/expressions/types';
import type { IOptionInternal } from 'src/features/options/castOptionsToStrings';
import type { IRawOption, ISelectionComponentFull } from 'src/layout/common.generated';
import type { ILayout } from 'src/layout/layout';
import type { fetchOptions } from 'src/queries/queries';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

interface RenderProps {
  type: 'single' | 'multi';
  via: 'layout' | 'api' | 'repeatingGroups';
  options?: (IRawOption & Record<string, unknown>)[];
  mapping?: Record<string, string>;
  optionFilter?: ExprValToActualOrExpr<ExprVal.Boolean>;
  selected?: string;
  preselectedOptionIndex?: number;
  fetchOptions?: jest.Mock<typeof fetchOptions>;
  extraLayout?: ILayout;
}

function TestOptions({ node }: { node: LayoutNode<'Dropdown' | 'MultipleSelect'> }) {
  const { options, setData, selectedValues } = useGetOptions(node.baseId, node.isType('Dropdown') ? 'single' : 'multi');

  const setterFor = (index: number) => () => setData([options[index].value]);

  return (
    <>
      <div data-testid='options'>{JSON.stringify(options)}</div>
      <div data-testid='currentStringy'>{JSON.stringify(selectedValues)}</div>
      <button onClick={setterFor(0)}>Choose first option</button>
      <button onClick={setterFor(1)}>Choose second option</button>
      <button onClick={setterFor(2)}>Choose third option</button>
      <button onClick={setterFor(3)}>Choose fourth option</button>
    </>
  );
}

async function render(props: RenderProps) {
  const layoutConfig: ISelectionComponentFull = {
    options: props.via === 'layout' ? props.options : undefined,
    optionsId: props.via === 'api' ? 'myOptions' : undefined,
    mapping: props.via === 'api' ? props.mapping : undefined,
    source:
      props.via === 'repeatingGroups'
        ? {
            group: 'Group',
            value: 'Group.value',
            label: 'myLabel',
          }
        : undefined,
    optionFilter: props.optionFilter,
    preselectedOptionIndex: props.preselectedOptionIndex,
  };

  return renderWithNode({
    renderer: ({ node }) => <TestOptions node={node as LayoutNode<'Dropdown' | 'MultipleSelect'>} />,
    nodeId: 'myComponent',
    inInstance: true,
    queries: {
      fetchLayouts: async () => ({
        FormLayout: {
          data: {
            layout: [
              ...(props.extraLayout ?? []),
              {
                type: props.type === 'single' ? 'Dropdown' : 'MultipleSelect',
                id: 'myComponent',
                dataModelBindings: {
                  simpleBinding: { dataType: defaultDataTypeMock, field: 'result' },
                },
                textResourceBindings: {
                  title: 'mockTitle',
                },
                ...layoutConfig,
              },
            ],
          },
        },
      }),
      fetchFormData: async () => ({
        Group: structuredClone(props.options ?? []).map((option, index) => ({
          [ALTINN_ROW_ID]: `row-${index}`,
          ...option,
        })),
        result: props.selected ?? '',
        someOther: 'value',
      }),
      fetchOptions:
        props.fetchOptions ??
        (async () =>
          ({
            data: props.options?.map((option) => ({
              value: option.value,
              label: option.label,
              description: option.description,
              helpText: option.helpText,
            })),
            headers: {},
          }) as AxiosResponse<IRawOption[]>),
      fetchTextResources: async () => ({
        resources: [
          {
            id: 'myLabel',
            value: '{0}',
            variables: [
              {
                dataSource: 'dataModel.default',
                key: 'Group[{0}].label',
              },
            ],
          },
        ],
        language: 'nb',
      }),
    },
  });
}

describe('useGetOptions', () => {
  const permutations: Omit<RenderProps, 'options'>[] = [
    { type: 'single', via: 'layout' },
    { type: 'single', via: 'api' },
    { type: 'single', via: 'repeatingGroups' },
    { type: 'multi', via: 'layout' },
    { type: 'multi', via: 'api' },
    { type: 'multi', via: 'repeatingGroups' },
  ];

  const filteredOptions = [{ label: 'first', value: 'foo' }];

  const unfilteredOptions = [
    { label: 'second', value: 'bar' },
    { label: 'third', value: 'baz' },
    { label: 'fourth', value: 'qux' },
  ];

  beforeEach(() => {
    jest
      .spyOn(window, 'logWarnOnce')
      .mockImplementation(() => {})
      .mockName(`window.logWarnOnce`);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(permutations)('options should be cast to strings for $type + $via', async (props) => {
    const options = [
      { label: 'first', value: 'hello' },
      { label: 'second', value: false },
      { label: 'third', value: 2 },
      { label: 'fourth', value: 3.14 },
    ];
    const { formDataMethods } = await render({
      ...props,
      options,
    });

    const textContent = screen.getByTestId('options').textContent;
    const asArray = JSON.parse(textContent as string) as IOptionInternal[];

    expect(asArray).toEqual([
      { label: 'first', value: 'hello' },
      { label: 'second', value: 'false' },
      { label: 'third', value: '2' },
      { label: 'fourth', value: '3.14' },
    ]);

    // Try setting the value to all the options, and observing that the saved value is the stringy version
    for (const option of options) {
      await userEvent.click(screen.getByRole('button', { name: `Choose ${option.label} option` }));
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        reference: { field: 'result', dataType: defaultDataTypeMock },
        newValue: option.value.toString(),
      });
      (formDataMethods.setLeafValue as jest.Mock).mockClear();

      const currentStringy = JSON.parse(screen.getByTestId('currentStringy').textContent as string);
      expect(currentStringy).toEqual([option.value.toString()]);
    }
  });

  it('should include the mapping in the api request', async () => {
    const fetchOptionsMock = jest.fn<typeof fetchOptions>().mockImplementation(
      async (_url: string) =>
        ({
          data: [] as IRawOption[],
          headers: {},
        }) as AxiosResponse<IRawOption[]>,
    );

    await render({
      via: 'api',
      type: 'single',
      mapping: { someOther: 'someParam', result: 'someEmpty' },
      fetchOptions: fetchOptionsMock,
    });

    expect(fetchOptionsMock).toHaveBeenCalledWith(
      expect.stringMatching(/^.+\/api\/options\/myOptions.+someParam=value&someEmpty=$/),
    );
  });

  it('should produce a warning if options are filtered out when selected', async () => {
    await render({
      type: 'single',
      via: 'api',
      options: [...filteredOptions, ...unfilteredOptions],
      selected: 'foo',
      optionFilter: ['notEquals', ['value'], 'foo'], // Filters out the selected option
    });

    await waitFor(() => {
      expect(JSON.parse(screen.getByTestId('options').textContent ?? 'null')).toEqual(unfilteredOptions);
    });

    expect(window.logWarnOnce).toHaveBeenCalledWith(
      `Node 'myComponent': Option with value "foo" was selected, but the option filter ` +
        `excludes it. This will cause the option to be deselected. If this was unintentional, add a check ` +
        `for the currently selected option in your optionFilter expression.`,
    );
  });

  it('should produce a warning if option values are duplicated', async () => {
    const remainingOption = { label: 'first', value: 'foo' };
    await render({
      type: 'single',
      via: 'api',
      options: [remainingOption, { label: 'second', value: 'foo' }],
    });

    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('options').textContent ?? 'null')).toEqual([remainingOption]),
    );

    expect(window.logWarnOnce).toHaveBeenCalledWith(
      'Option was duplicate value (and was removed). With duplicate values, it is impossible to tell which of the options the user selected.\n',
      JSON.stringify({ value: 'foo', label: 'second' }, null, 2),
    );
  });

  it('dataModel lookups per-row when using repeatingGroups should work', async () => {
    await render({
      type: 'single',
      via: 'repeatingGroups',
      options: [
        // These are actually rows in the data model
        { label: 'first', value: 'foo', useInOptions: 'keep' },
        { label: 'second', value: 'bar', useInOptions: 'scrap' },
        { label: 'third', value: 'baz', useInOptions: 'keep' },
      ],
      optionFilter: ['equals', ['dataModel', 'Group.useInOptions'], 'keep'],
    });

    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('options').textContent ?? 'null')).toEqual([
        { value: 'foo', label: 'first' },
        { value: 'baz', label: 'third' },
      ]),
    );
  });

  it('component lookups per-row when using repeatingGroups should work', async () => {
    await render({
      type: 'single',
      via: 'repeatingGroups',
      options: [
        // These are actually rows in the data model
        { label: 'first', value: 'foo', useInOptions: 'keep' },
        { label: 'second', value: 'bar', useInOptions: 'scrap' },
        { label: 'third', value: 'baz', useInOptions: 'keep' },
      ],
      optionFilter: ['equals', ['component', 'ShouldUseInOptions'], 'keep'],
      extraLayout: [
        {
          id: 'someRepGroup',
          type: 'RepeatingGroup',
          dataModelBindings: {
            group: {
              dataType: defaultDataTypeMock,
              field: 'Group',
            },
          },
          children: ['FirstInside', 'ShouldUseInOptions'],
        },
        {
          id: 'FirstInside',
          type: 'Header',
          textResourceBindings: {
            title: 'This title is not important',
          },
          size: 'L',
        },
        {
          id: 'ShouldUseInOptions',
          type: 'Input',
          dataModelBindings: {
            simpleBinding: {
              dataType: defaultDataTypeMock,
              field: 'Group.useInOptions',
            },
          },
        },
      ],
    });

    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId('options').textContent ?? 'null')).toEqual([
        { value: 'foo', label: 'first' },
        { value: 'baz', label: 'third' },
      ]),
    );
  });
});
