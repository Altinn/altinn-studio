import React from 'react';

import { Button } from '@digdir/designsystemet-react';

import { TextAreaLayout } from '@app/form-component';

import { FormStore } from 'src/features/form/FormContext';
import { useDataModelBindings } from 'src/features/formData/useDataModelBindings';
import { useLanguage } from 'src/features/language/useLanguage';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { useIsValid } from 'src/features/validation/selectors/isValid';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useLabelData } from 'src/utils/layout/useLabelData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

/**
 * Et tekstfelt med diktering: brukeren kan snakke i stedet for å skrive.
 *
 * Lyden forlater aldri maskinen via oss. Vi bruker nettleserens egen
 * SpeechRecognition, som holder brukeren utenfor en ekstra databehandler og gjør
 * at komponenten virker uten noe backend-kall.
 *
 * Safari støtter ikke API-et. Da skjules knappen, og feltet er et vanlig
 * tekstfelt - tale er en hjelp, aldri eneste vei inn.
 */
interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

function hentTalegjenkjenning(): (new () => ISpeechRecognition) | undefined {
  const w = window as unknown as {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export type IDiktafonProps = Readonly<PropsFromGenericComponent<'Diktafon'>>;

export function DiktafonComponent({ baseComponentId, overrideDisplay }: IDiktafonProps) {
  const { langAsString } = useLanguage();
  const { readOnly, dataModelBindings, maxLength, grid, textResourceBindings, sprak } = useItemWhenType(
    baseComponentId,
    'Diktafon',
  );

  const { setValue, formData } = useDataModelBindings(dataModelBindings);
  const debounce = FormStore.data.useDebounceImmediately();
  const isValid = useIsValid(baseComponentId);

  const { title, help, description, required, showOptionalMarking } = useLabelData({
    baseComponentId,
    overrideDisplay,
  });
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);

  const [lytter, settLytter] = React.useState(false);
  const [feil, settFeil] = React.useState(false);
  const gjenkjenner = React.useRef<ISpeechRecognition | null>(null);
  // Teksten som lå der da opptaket startet. Tale legges til, den erstatter aldri.
  const utgangspunkt = React.useRef('');

  const stoetter = React.useMemo(() => hentTalegjenkjenning() !== undefined, []);
  const verdi = formData.simpleBinding;

  const stopp = React.useCallback(() => {
    gjenkjenner.current?.stop();
    gjenkjenner.current = null;
    settLytter(false);
    debounce('blur');
  }, [debounce]);

  const start = React.useCallback(() => {
    const Gjenkjenner = hentTalegjenkjenning();
    if (!Gjenkjenner) {
      return;
    }
    settFeil(false);
    utgangspunkt.current = verdi ? `${verdi} ` : '';

    const r = new Gjenkjenner();
    r.lang = sprak ?? 'nb-NO';
    r.continuous = true;
    // Foreløpige resultater vises også, slik at brukeren ser at det virker mens hen
    // snakker. Det endelige svaret erstatter dem når setningen er ferdig.
    r.interimResults = true;

    r.onresult = (event) => {
      let tekst = '';
      for (let i = 0; i < event.results.length; i++) {
        tekst += event.results[i][0].transcript;
      }
      setValue('simpleBinding', `${utgangspunkt.current}${tekst}`);
    };
    r.onerror = (event) => {
      // "no-speech" og "aborted" er normale avslutninger, ikke noe å skremme med.
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        settFeil(true);
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
  }, [setValue, sprak, stopp, verdi, debounce]);

  // Et opptak som lever videre etter at komponenten er borte, ville fortsatt lyttet
  // på mikrofonen uten at noe vises på skjermen.
  React.useEffect(() => () => gjenkjenner.current?.stop(), []);

  return (
    <>
      <TextAreaLayout
        componentId={componentId}
        value={verdi}
        onChange={(v) => setValue('simpleBinding', v)}
        onBlur={() => debounce('blur')}
        readOnly={readOnly}
        required={required}
        error={!isValid}
        maxLength={maxLength}
        title={title}
        ariaLabel={
          overrideDisplay?.renderedInTable === true && textResourceBindings?.title
            ? langAsString(textResourceBindings.title)
            : undefined
        }
        help={help}
        description={description}
        showOptionalMarking={showOptionalMarking}
        labelGrid={grid?.labelGrid}
        innerGrid={innerGrid}
        validationGrid={validationGrid}
        validationMessages={
          showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
        }
      />
      {stoetter && !readOnly && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Button
            type='button'
            variant={lytter ? 'primary' : 'secondary'}
            data-color={lytter ? 'danger' : undefined}
            onClick={lytter ? stopp : start}
            aria-pressed={lytter}
          >
            {langAsString(lytter ? 'diktafon.stopp' : 'diktafon.start')}
          </Button>
          {lytter && <span role='status'>{langAsString('diktafon.lytter')}</span>}
          {feil && <span role='alert'>{langAsString('diktafon.feil')}</span>}
        </div>
      )}
    </>
  );
}
