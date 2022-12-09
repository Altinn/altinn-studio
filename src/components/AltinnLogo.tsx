import React from 'react';
import appTheme from 'src/theme/altinnAppTheme';
import 'src/styles/shared.css';

export interface IAltinnLogoProps {
  color: string;
}

function getLogoColor(color: string) {
  const colors = appTheme.altinnPalette.primary;
  switch (color) {
    case 'white':
    case colors.white:
      return 'white';

    case 'blueDark':
    case colors.blueDark:
      return 'blue';

    default:
      return 'black';
  }
}

export const AltinnLogo = ({ color }: IAltinnLogoProps) => {
  const logoColor = getLogoColor(color);
  let filterClass = '';

  if (logoColor === 'black') {
    filterClass = ` logo-filter-${color.replace('#', '')}`;
  }

  return (
    <img
      src={`https://altinncdn.no/img/Altinn-logo-${logoColor}.svg`}
      className={`logo${filterClass}`}
      alt='Altinn logo'
      id='logo'
    />
  );
};

export default AltinnLogo;
