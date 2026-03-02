import React from 'react';

import { Link } from '@digdir/designsystemet-react';
import { EnvelopeClosedIcon, InformationSquareIcon, PhoneIcon } from '@navikt/aksel-icons';

import { GlobalData } from 'nextsrc/core/globalData';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';

import classes from 'src/features/footer/Footer.module.css';
import type { IFooterComponent, IFooterComponentType, IFooterIcon } from 'src/features/footer/types';

const iconMap: Record<IFooterIcon, typeof EnvelopeClosedIcon> = {
  email: EnvelopeClosedIcon,
  phone: PhoneIcon,
  information: InformationSquareIcon,
};

function FooterIconEl({ icon }: { icon?: IFooterIcon }) {
  if (!icon) {
    return null;
  }
  const IconComponent = iconMap[icon];
  return (
    <IconComponent
      aria-hidden={true}
      height={20}
      width={20}
    />
  );
}

export function AppFooter() {
  const footerLayout = GlobalData.footer;
  const footerElements = footerLayout?.footer;

  if (!footerElements) {
    return null;
  }

  return (
    <footer className={classes.footer}>
      <div className={classes.elements}>
        {footerElements.map((el) => (
          <FooterComponent
            key={el.title}
            element={el}
          />
        ))}
      </div>
    </footer>
  );
}

function FooterComponent({ element }: { element: IFooterComponent<IFooterComponentType> }) {
  const { langAsString } = useLanguage();

  switch (element.type) {
    case 'Email':
      return (
        <Link href={`mailto:${langAsString(element.target)}`}>
          <FooterIconEl icon='email' />
          {langAsString(element.title)}
        </Link>
      );
    case 'Link':
      return (
        <Link
          href={langAsString(element.target)}
          target='_blank'
          rel='noreferrer'
        >
          {'icon' in element && <FooterIconEl icon={element.icon as IFooterIcon} />}
          {langAsString(element.title)}
        </Link>
      );
    case 'Phone':
      return (
        <Link href={`tel:${langAsString(element.target)}`}>
          <FooterIconEl icon='phone' />
          {langAsString(element.title)}
        </Link>
      );
    case 'Text':
      return <span>{langAsString(element.title)}</span>;
    default:
      return null;
  }
}
