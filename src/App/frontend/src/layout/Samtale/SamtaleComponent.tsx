import React from 'react';

import { Button, Fieldset, Heading, Paragraph, Textarea } from '@digdir/designsystemet-react';

import { RadioButton } from 'src/components/form/RadioButton';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { finnAlternativ, hentTalegjenkjenning } from 'src/layout/Samtale/talegjenkjenning';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { ITalegjenkjenner } from 'src/layout/Samtale/talegjenkjenning';
import type { PropsFromGenericComponent } from 'src/layout';

export type ISamtaleProps = Readonly<PropsFromGenericComponent<'Samtale'>>;

export function SamtaleComponent({ baseComponentId }: ISamtaleProps) {
  const { langAsString } = useLanguage();
  const { steg, sprak } = useItemWhenType(baseComponentId, 'Samtale');
  const debounce = FormStore.data.useDebounceImmediately();

  // Alle stegene bindes i én omgang, slik at komponenten kan lese og skrive
  // hvilket som helst av dem uten å vite noe om skjemaet rundt.
  const bindinger = React.useMemo(
    () => Object.fromEntries(steg.map((s) => [s.id, s.binding])),
    [steg],
  );
  const { formData, setValue } = useDataModelBindings(bindinger);

  const [lytter, settLytter] = React.useState(false);
  const [ikkeForstod, settIkkeForstod] = React.useState(false);
  const gjenkjenner = React.useRef<ITalegjenkjenner | null>(null);
  const stoetter = React.useMemo(() => hentTalegjenkjenning() !== undefined, []);

  // Aktivt steg er det første som mangler svar. Er alt besvart, står vi på det siste,
  // slik at søkeren kan rette det hen nettopp sa.
  const besvart = (id: string) => {
    const v = formData[id];
    return typeof v === 'string' && v.trim().length > 0;
  };
  // Et steg kan avslutte samtalen - som «ja» på blind eller rullestolbruker, der
  // skjemaet sier at søkeren er ferdig. Da faller resten av stegene bort.
  const avsluttetVed = steg.findIndex((s) => s.avsluttVerdi && formData[s.id] === s.avsluttVerdi);
  const aktuelle = avsluttetVed === -1 ? steg : steg.slice(0, avsluttetVed + 1);
  const foerste = aktuelle.findIndex((s) => !besvart(s.id) && !s.valgfritt);
  const [manueltValgt, settManueltValgt] = React.useState<number | null>(null);
  const aktiv = manueltValgt ?? (foerste === -1 ? aktuelle.length - 1 : foerste);
  const aktivtSteg = aktuelle[aktiv];

  const stopp = React.useCallback(() => {
    gjenkjenner.current?.stop();
    gjenkjenner.current = null;
    settLytter(false);
    debounce('blur');
  }, [debounce]);

  React.useEffect(() => () => gjenkjenner.current?.stop(), []);

  const start = React.useCallback(() => {
    const Gjenkjenner = hentTalegjenkjenning();
    if (!Gjenkjenner || !aktivtSteg) {
      return;
    }
    settIkkeForstod(false);
    const erValg = (aktivtSteg.alternativer?.length ?? 0) > 0;
    const utgangspunkt = erValg ? '' : ((formData[aktivtSteg.id] as string) ?? '');

    const r = new Gjenkjenner();
    r.lang = sprak ?? 'nb-NO';
    // På et valgsteg lytter vi etter ett svar og stopper. På fritekst lar vi
    // søkeren snakke så lenge hen vil.
    r.continuous = !erValg;
    r.interimResults = !erValg;

    r.onresult = (event) => {
      let sagt = '';
      for (let i = 0; i < event.results.length; i++) {
        sagt += event.results[i][0].transcript;
      }
      if (erValg) {
        const truffet = finnAlternativ(sagt, aktivtSteg.alternativer ?? []);
        if (truffet) {
          setValue(aktivtSteg.id, truffet);
          settManueltValgt(null);
          stopp();
        } else {
          settIkkeForstod(true);
        }
        return;
      }
      setValue(aktivtSteg.id, utgangspunkt ? `${utgangspunkt} ${sagt}` : sagt);
    };
    r.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        settIkkeForstod(true);
      }
      stopp();
    };
    r.onend = () => {
      settLytter(false);
      gjenkjenner.current = null;
      debounce('blur');
    };

    gjenkjenner.current = r;
    r.start();
    settLytter(true);
  }, [aktivtSteg, formData, setValue, sprak, stopp, debounce]);

  if (!aktivtSteg) {
    return null;
  }

  const erValg = (aktivtSteg.alternativer?.length ?? 0) > 0;
  const ferdig = aktuelle.every((s) => s.valgfritt || besvart(s.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Besvarte steg vises som én linje hver, ikke som skjemafelter. */}
      {aktuelle.map((s, i) =>
        i !== aktiv && besvart(s.id) ? (
          <button
            key={s.id}
            type='button'
            onClick={() => settManueltValgt(i)}
            style={{
              textAlign: 'left',
              background: 'none',
              border: 'none',
              borderInlineStart: '3px solid var(--ds-color-neutral-border-subtle, #ccc)',
              paddingInlineStart: '0.75rem',
              cursor: 'pointer',
              color: 'inherit',
              font: 'inherit',
            }}
          >
            <span style={{ opacity: 0.7 }}>{langAsString(s.sporsmaal)}</span>
            <br />
            <strong>{visSvar(s, formData[s.id] as string, langAsString)}</strong>
          </button>
        ) : null,
      )}

      <div>
        <Heading
          level={3}
          data-size='xs'
        >
          {langAsString(aktivtSteg.sporsmaal)}
        </Heading>
        {aktivtSteg.hjelp && <Paragraph data-size='sm'>{langAsString(aktivtSteg.hjelp)}</Paragraph>}
      </div>

      {erValg ? (
        <Fieldset>
          {(aktivtSteg.alternativer ?? []).map((a) => (
            <RadioButton
              key={a.value}
              name={aktivtSteg.id}
              value={a.value}
              label={langAsString(a.label)}
              checked={formData[aktivtSteg.id] === a.value}
              onChange={() => {
                setValue(aktivtSteg.id, a.value);
                settManueltValgt(null);
                debounce('blur');
              }}
              data-size='sm'
            />
          ))}
        </Fieldset>
      ) : (
        <Textarea
          value={(formData[aktivtSteg.id] as string) ?? ''}
          onChange={(e) => setValue(aktivtSteg.id, e.target.value)}
          onBlur={() => debounce('blur')}
          rows={6}
        />
      )}

      {stoetter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button
            type='button'
            variant={lytter ? 'primary' : 'secondary'}
            data-color={lytter ? 'danger' : undefined}
            onClick={lytter ? stopp : start}
            aria-pressed={lytter}
          >
            {langAsString(lytter ? 'samtale.stopp' : erValg ? 'samtale.svarMedTale' : 'samtale.snakk')}
          </Button>
          {lytter && <span role='status'>{langAsString('samtale.lytter')}</span>}
          {ikkeForstod && <span role='alert'>{langAsString('samtale.ikkeForstod')}</span>}
        </div>
      )}

      {ferdig && <Paragraph data-size='sm'>{langAsString('samtale.ferdig')}</Paragraph>}
    </div>
  );
}

function visSvar(
  s: { alternativer?: { value: string; label: string }[] },
  verdi: string,
  oversett: (n: string) => string,
): string {
  const treff = s.alternativer?.find((a) => a.value === verdi);
  return treff ? oversett(treff.label) : verdi;
}
