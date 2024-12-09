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

const regex = /(\p{L}+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})-(\d+)-(\d+)/u;
export function splitDashedKeyRegex(componentId: string): SplitKey {
  const result = componentId.match(regex);
  if (!result || result.length < 4) {
    return {
      baseComponentId: componentId,
      stringDepth: '',
      stringDepthWithLeadingDash: '',
      depth: [],
    };
  }

  const stringDepth = `${result[2]}-${result[3]}`;
  return {
    baseComponentId: result[1],
    stringDepth,
    stringDepthWithLeadingDash: `-${stringDepth}`,
    depth: [parseInt(result[2], 10), parseInt(result[3], 10)],
  };
}

export function splitDashedKeyIterative(componentId: string): SplitKey {
  let firstDepth: number | undefined;
  let secondDepth: number | undefined;
  let lastDashIndex = componentId.length;
  for (let i = componentId.length - 1; i >= 0; i--) {
    if (componentId[i] === '-') {
      lastDashIndex = i;

      if (secondDepth === undefined) {
        secondDepth = parseInt(componentId.slice(i + 1), 10);
        if (Number.isNaN(secondDepth)) {
          throw new Error('Invalid componentId');
        }
      } else {
        firstDepth = parseInt(componentId.slice(i + 1, lastDashIndex), 10);
        if (Number.isNaN(secondDepth)) {
          throw new Error('Invalid componentId');
        }
        if (i - 1 < 0) {
          throw new Error('Invalid componentId');
        }
        break;
      }
    }
  }

  if (firstDepth === undefined || secondDepth === undefined) {
    return {
      baseComponentId: componentId,
      stringDepth: '',
      stringDepthWithLeadingDash: '',
      depth: [],
    };
  }

  const stringDepth = `${firstDepth}-${secondDepth}`;
  return {
    baseComponentId: componentId.slice(0, lastDashIndex),
    stringDepth,
    stringDepthWithLeadingDash: `-${stringDepth}`,
    depth: [firstDepth, secondDepth],
  };
}
