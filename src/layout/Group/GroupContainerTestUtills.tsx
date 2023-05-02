import React from 'react';

import { GroupContainer } from 'src/layout/Group/GroupContainer';
import { useResolvedNode } from 'src/utils/layout/ExprContext';

export function GroupContainerTester(props: { id: string }) {
  const node = useResolvedNode(props.id);
  if (!node || !node.isRepGroup()) {
    throw new Error(`Could not resolve node with id ${props.id}, or unexpected node type`);
  }

  return <GroupContainer node={node} />;
}
