import * as React from 'react';
import appTheme from '../theme/altinnAppTheme';
import '../styles/styles.css';

export interface IAltinnLogoProps {
  color: string;
}

function getLogoColor(color: string) {
  const colors = appTheme.altinnPalette.primary;
  switch (color) {
    case ('white'):
    case (colors.white):
      return 'white';

    case ('blueDark'):
    case (colors.blueDark):
      return 'blue';

    default:
      return 'black';
  }
}

export const altinnLogo = (props: IAltinnLogoProps) => {
  const logoColor = getLogoColor(props.color);
  let filterClass = '';
  if (logoColor === 'black') {
    filterClass = ` logo-filter-${props.color.replace('#', '')}`;
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

export default altinnLogo;
