import React from 'react';

import { EnvelopeClosedIcon, InformationSquareIcon, PhoneIcon } from '@navikt/aksel-icons';

import type { IFooterIcon } from 'src/features/footer/types';

interface FooterIconProps {
  icon: IFooterIcon;
}
type Icon = typeof EnvelopeClosedIcon;
type IFooterIconMap = {
  [K in IFooterIcon]: Icon;
};

const FooterIconMap: IFooterIconMap = {
  email: EnvelopeClosedIcon,
  information: InformationSquareIcon,
  phone: PhoneIcon,
};

export const FooterIcon = ({ icon }: FooterIconProps) => {
  const IconComponent = FooterIconMap[icon];
  return (
    <IconComponent
      aria-hidden={true}
      height={20}
      width={20}
    />
  );
};
