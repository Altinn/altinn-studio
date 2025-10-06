import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { ForwardedRef } from 'react';
import React from 'react';
import type { StudioListRootProps } from './StudioList';
import { StudioList } from './StudioList';
import { testRootClassNameAppending } from '../../test-utils/testRootClassNameAppending';
import { testRefForwarding } from '../../test-utils/testRefForwarding';
import { testCustomAttributes } from '../../test-utils/testCustomAttributes';

type TestCase = {
  renderList: (props?: StudioListRootProps, ref?: ForwardedRef<HTMLDivElement>) => RenderResult;
};

const testCases: Record<string, TestCase> = {
  UnorderedList: {
    renderList: renderUnorderedList,
  },
  OrderedList: {
    renderList: renderOrderedList,
  },
};

describe.each(Object.keys(testCases))('%s', (listType) => {
  const { renderList } = testCases[listType];

  it('Renders a list', () => {
    renderList();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('Renders list items', () => {
    renderList();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('Applies class name to the root', () => {
    testRootClassNameAppending((className) => renderList({ className }));
  });

  it('Forwards the ref to the root element if given', () => {
    testRefForwarding<HTMLDivElement>((ref) => renderList({}, ref));
  });

  it('Appends custom attributes to the root element', () => {
    testCustomAttributes<HTMLDivElement>(renderList);
  });
});

function renderUnorderedList(
  props: StudioListRootProps = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult {
  return render(
    <StudioList.Root {...props} ref={ref}>
      <StudioList.Unordered>
        <ListItems />
      </StudioList.Unordered>
    </StudioList.Root>,
  );
}

function renderOrderedList(
  props: StudioListRootProps = {},
  ref?: ForwardedRef<HTMLDivElement>,
): RenderResult {
  return render(
    <StudioList.Root {...props} ref={ref}>
      <StudioList.Ordered>
        <ListItems />
      </StudioList.Ordered>
    </StudioList.Root>,
  );
}

function ListItems(): React.ReactElement {
  return (
    <>
      <StudioList.Item>Item 1</StudioList.Item>
      <StudioList.Item>Item 2</StudioList.Item>
      <StudioList.Item>Item 3</StudioList.Item>
    </>
  );
}
