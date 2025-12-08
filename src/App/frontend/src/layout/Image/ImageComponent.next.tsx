import React from 'react';

import type { CompImageExternal } from 'src/layout/Image/config.generated';

export function ImageComponentNext(props: CompImageExternal) {
  const lang = window.AltinnAppGlobalData.userProfile.profileSettingPreference.language!;

  const chosenSrc = props.image?.src[lang];

  const src = chosenSrc ? chosenSrc : props.image?.src['nb'];

  return src ? (
    <img
      src={src}
      alt=''
    />
  ) : (
    src
  );
}
