import React, { useState } from 'react';

import { Dropdown } from '@digdir/designsystemet-react';
import { CheckmarkIcon, ChevronDownIcon, GlobeIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import classes from 'src/components/presentation/LanguageSelector.module.css';
import { Lang } from 'src/features/language/Lang';
import {
  useAppLanguages,
  useCurrentLanguage,
  useSetLanguageWithSelector,
} from 'src/features/language/LanguageProvider';
import { useLanguage } from 'src/features/language/useLanguage';
import { useIsMobile } from 'src/hooks/useDeviceWidths';

export const LanguageSelector = () => {
  const isMobile = useIsMobile();
  const currentLanguage = useCurrentLanguage();
  const appLanguages = useAppLanguages();
  const setWithLanguageSelector = useSetLanguageWithSelector();
  const { langAsString } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);

  function updateLanguage(lang: string) {
    setIsOpen(false);
    setWithLanguageSelector(lang);
  }

  if (!appLanguages?.length) {
    return null;
  }

  return (
    <Dropdown.TriggerContext>
      <Dropdown.Trigger
        data-size='sm'
        variant='tertiary'
        onClick={() => setIsOpen((o) => !o)}
        aria-label={langAsString('language.language_selection')}
        className={cn(classes.button, { [classes.buttonActive]: isOpen })}
      >
        <GlobeIcon
          className={classes.icon}
          aria-hidden
        />
        {!isMobile && <Lang id='language.language_selection' />}
        <ChevronDownIcon
          className={cn(classes.icon, { [classes.flipVertical]: isOpen })}
          aria-hidden
        />
      </Dropdown.Trigger>
      <Dropdown
        role='menu'
        data-size='sm'
        open={isOpen}
        onClose={() => setIsOpen(false)}
      >
        {isMobile && (
          <Dropdown.Heading>
            <Lang id='language.language_selection' />
          </Dropdown.Heading>
        )}
        <Dropdown.List>
          {appLanguages?.map((lang) => {
            const selected = currentLanguage === lang;

            return (
              <Dropdown.Item key={lang}>
                <Dropdown.Button
                  onClick={() => updateLanguage(lang)}
                  aria-checked={selected}
                  role='menuitemradio'
                >
                  <CheckmarkIcon
                    style={{ opacity: selected ? 1 : 0 }}
                    className={cn(classes.icon, classes.checkmark)}
                    aria-hidden
                  />
                  <Lang id={`language.full_name.${lang}`} />
                </Dropdown.Button>
              </Dropdown.Item>
            );
          })}
        </Dropdown.List>
      </Dropdown>
    </Dropdown.TriggerContext>
  );
};
