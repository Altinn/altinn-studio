import React, { createRef, MutableRefObject } from 'react';
import { render } from '@testing-library/react';
import {
  TreeViewRoot,
  TreeViewRootRef,
} from 'app-shared/components/TreeView/TreeViewRoot/TreeViewRoot';
import { TreeViewItem } from 'app-shared/components/TreeView/TreeViewItem';

describe('TreeViewRoot', () => {
  describe('ref.hasItems', () => {
    it('Returns true if there are tree items', () => {
      const ref: MutableRefObject<TreeViewRootRef> = createRef<TreeViewRootRef>(null);
      render(
        <TreeViewRoot ref={ref}>
          <TreeViewItem nodeId='1' label='1' />
        </TreeViewRoot>,
      );
      expect(ref.current?.hasItems()).toBe(true);
    });

    it('Returns false if there are no tree items', () => {
      const ref: MutableRefObject<TreeViewRootRef> = createRef<TreeViewRootRef>(null);
      render(<TreeViewRoot ref={ref} />);
      expect(ref.current?.hasItems()).toBe(false);
    });
  });
});
