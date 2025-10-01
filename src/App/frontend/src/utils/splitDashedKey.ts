interface SplitKey {
  baseComponentId: string;
  stringDepth: string;
  stringDepthWithLeadingDash: string;
  depth: number[];
}

/**
 * Takes a dashed component id (possibly inside a repeating group row), like 'myComponent-0-1' and returns
 * a workable object:
 *   {
 *     baseComponentId: 'myComponent',
 *     stringDepth: '0-1',
 *     stringDepthWithLeadingDash: '-0-1',
 *     depth: [0, 1],
 *   }
 */
export function splitDashedKey(componentId: string): SplitKey {
  const parts = componentId.split('-');

  const depth: number[] = [];
  while (parts.length) {
    const toConsider = parts.pop();

    // Since our form component IDs are usually UUIDs, they will contain hyphens and may even end in '-<number>'.
    // We'll assume the application has less than 5-digit repeating group elements (the last leg of UUIDs are always
    // longer than 5 digits).
    if (toConsider?.match(/^\d{1,5}$/)) {
      depth.push(parseInt(toConsider, 10));
    } else {
      depth.reverse();
      const stringDepth = depth.join('-').toString();
      return {
        baseComponentId: [...parts, toConsider].join('-'),
        stringDepth,
        stringDepthWithLeadingDash: stringDepth ? `-${stringDepth}` : '',
        depth,
      };
    }
  }

  return {
    baseComponentId: componentId,
    stringDepth: '',
    stringDepthWithLeadingDash: '',
    depth: [],
  };
}

// If all you want is the baseId, use this instead
// If you see this, feel free to optimize this further ;)
export function getBaseComponentId(componentId: string): string {
  const parts = componentId.split('-');

  while (parts.length) {
    const toConsider = parts.pop();

    // Since our form component IDs are usually UUIDs, they will contain hyphens and may even end in '-<number>'.
    // We'll assume the application has less than 5-digit repeating group elements (the last leg of UUIDs are always
    // longer than 5 digits).
    if (!toConsider?.match(/^\d{1,5}$/)) {
      return [...parts, toConsider].join('-');
    }
  }

  return componentId;
}
