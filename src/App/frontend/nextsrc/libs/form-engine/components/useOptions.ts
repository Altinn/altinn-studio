import { useEffect, useState } from 'react';

import { GlobalData } from 'nextsrc/core/globalData';

import type { IRawOption } from 'src/layout/common.generated';

interface OptionsConfig {
  options?: IRawOption[];
  optionsId?: string;
}

export function useOptions(config: OptionsConfig): IRawOption[] {
  const [fetched, setFetched] = useState<IRawOption[]>([]);

  const { options, optionsId } = config;

  useEffect(() => {
    if (options || !optionsId) {
      return;
    }
    const url = `${GlobalData.basename}/api/options/${optionsId}`;
    fetch(url)
      .then((res) => res.json())
      .then((data: IRawOption[]) => setFetched(data))
      .catch(() => setFetched([]));
  }, [options, optionsId]);

  return options ?? fetched;
}
