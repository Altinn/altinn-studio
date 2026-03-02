import React from 'react';
import { Button } from 'react-day-picker';

import { GlobalData } from 'nextsrc/core/globalData';

import type { CompButtonExternal } from 'src/layout/Button/config.generated';

export function ButtonComponent(props: CompButtonExternal) {
  const resolvedTitle = GlobalData.textResources?.resources.find(
    (resource) => resource.id === props.textResourceBindings?.title,
  );

  return <Button>{resolvedTitle ? resolvedTitle.value : props.textResourceBindings?.title}</Button>;
}
