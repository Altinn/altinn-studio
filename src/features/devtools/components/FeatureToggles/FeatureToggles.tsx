import React, { useCallback, useState } from 'react';

import { Button, Checkbox, Heading, Label, Paragraph } from '@digdir/design-system-react';

import classes from 'src/features/devtools/components/FeatureToggles/FeatureToggles.module.css';
import { SplitView } from 'src/features/devtools/components/SplitView/SplitView';
import { getAugmentedFeatures } from 'src/features/toggles';
import { getParsedLanguageFromText } from 'src/language/sharedLanguage';
import type { FeatureToggleSource, IFeatureToggles } from 'src/features/toggles';

const sourceMap: { [key in FeatureToggleSource]: string } = {
  cookie: 'Overstyrt av cookie',
  window: 'Overstyrt av window-objektet',
  default: 'Standardverdi',
};

export function FeatureToggles() {
  const featureMap = getAugmentedFeatures();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const setFeature = useCallback(
    (feature: IFeatureToggles, newValue: boolean) => {
      const { value: prevValue } = featureMap[feature];
      if (newValue !== prevValue) {
        setOverrides({ ...overrides, [feature]: newValue });
      } else if (feature in overrides) {
        const { [feature]: _, ...rest } = overrides;
        setOverrides(rest);
      }
    },
    [featureMap, overrides],
  );

  return (
    <SplitView
      direction={'row'}
      minContent
    >
      <div className={classes.list}>
        {Object.values(featureMap).map(({ title, defaultValue, description, key, value, source, links }) => (
          <>
            <div
              key={`${key}-checkbox`}
              className={classes.itemCheckbox}
            >
              <Checkbox
                disabled={source === 'window'}
                checked={overrides[key] ?? value}
                checkboxId={`${key}-checkbox`}
                onChange={(ev) => setFeature(key, ev.target.checked)}
              />
            </div>
            <label
              key={`${key}-content`}
              htmlFor={`${key}-checkbox`}
              className={classes.itemContent}
            >
              <Heading
                spacing={true}
                size={'small'}
                level={4}
              >
                {getParsedLanguageFromText(title)}
              </Heading>
              <Label size={'xsmall'}>Nøkkel: {key}</Label>
              <br />
              <Label size={'xsmall'}>
                Verdi: {JSON.stringify(value)} / Standardverdi: {JSON.stringify(defaultValue)}
              </Label>
              <br />
              <Label size={'xsmall'}>Kilde: {sourceMap[source]}</Label>
              <Paragraph>
                {getParsedLanguageFromText(description)}
                {links && links.length && (
                  <ul className={classes.linkList}>
                    {links.map((url) => (
                      <li key={url}>
                        <a
                          href={url}
                          target={'_blank'}
                          rel='noreferrer'
                        >
                          {url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </Paragraph>
            </label>
          </>
        ))}
        <div className={classes.button}>
          <Button
            disabled={Object.keys(overrides).length <= 0}
            onClick={() => {
              const { org, app } = window;
              for (const [key, value] of Object.entries(overrides)) {
                const { defaultValue } = featureMap[key];
                if (value === defaultValue) {
                  document.cookie = `FEATURE_${key}=;path=/${org}/${app};expires=Thu, 01 Jan 1970 00:00:01 GMT`;
                } else {
                  document.cookie = `FEATURE_${key}=${value ? 'true' : 'false'};path=/${org}/${app}`;
                }
              }

              window.location.reload();
            }}
          >
            Lagre (laster siden på nytt)
          </Button>
        </div>
      </div>
      <div className={classes.sideBar}>
        <Paragraph>
          Verdier kan overstyres ved å krysse av i listen til venstre. Da vil det settes en cookie som overstyrer
          verdien midlertidig for denne appen.
        </Paragraph>
        <Paragraph>
          Dersom du ønsker å overstyre verdier for appen din permanent (inntil vi fjerner flagget), kan du gjøre det ved
          å overstyre verdier i window-objektet. Dette kan gjøres ved å redigere på filen
        </Paragraph>
        <pre>App/views/Home/Index.cshtml</pre>
        <Paragraph>og legge til følgende:</Paragraph>
        <pre>
          {[
            '<script>',
            'window.featureToggles = window.featureToggles || {};',
            "window.featureToggles['nøkkel'] = true;",
            '</script>',
          ].join('\n')}
        </pre>
        <Paragraph>
          Endre på nøkkel og verdi etter behov, ut fra listen med funksjonalitet som kan aktiveres/deaktiveres til
          venstre. Dersom du ønsker å fjerne overstyring av en verdi, kan du slette linjen med nøkkel og verdi.
        </Paragraph>
      </div>
    </SplitView>
  );
}
