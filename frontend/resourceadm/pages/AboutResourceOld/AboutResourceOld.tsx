import React from 'react';
import classes from './AboutResourceOld.module.css';
import { RessursTittelInput } from '../../components/RessursTittelInput';
import { RessursBeskrivelseInput } from '../../components/RessursBeskrivelseInput';
import { RessursRettighetsBeskrivelseInput } from '../../components/RessursRettighetsBeskrivelseInput';
import { RessursSektorValg } from '../../components/RessursSektorValg';
import { RessursTematikkValg } from '../../components/RessursTematikkValg';
import { RessursTypeValg } from '../../components/RessursTypeValg';
import { useState } from 'react';

export const AboutResourceOld = () => {
  // Første TextField fra @digdir/design-system-react;
  // Andre tekstfelt : Description = Beskrivelse
  // Tredje tekstfelt : RettighetsBeskrivelse = RightsDescription

  const [valueTextField1, setValueTextField1] = useState('gammelTittel');
  const [valueTextField2, setValueTextField2] = useState('gammelBeskrivelse');
  const [valueTextField3, setValueTextField3] = useState('gammelRettighetsBeskrivelse');

  const handleTextField1Change = (input: string) => setValueTextField1(input);
  const handleTextField2Change = (input: string) => setValueTextField2(input);
  const handleTextField3Change = (input: string) => setValueTextField3(input);

  // Første Nedtrekksmeny/Valg : Sektor
  // Andre Nedtrekksmeny/Valg : Thematic Area
  // Tredje Nedtrekksmeny/Valg : Ressurstype a la MaskinportenSchema

  const [valueValg1, setValueValg1] = useState('Alarm');
  const [valueValg2, setValueValg2] = useState('Area51');
  const [valueValg3, setValueValg3] = useState('MaskinportenSchema');

  const handleValg1Change = (input: string) => setValueValg1(input);
  const handleValg2Change = (input: string) => setValueValg2(input);
  const handleValg3Change = (input: string) => setValueValg3(input);

  return (
    <div className='ressurs1Side'>
      <div className={classes.bannerOgBoksKontainer}>
        <div className={classes.fleksBoksHolder}>
          <div className={classes.venstreHvitBoks}>
            <p className={classes.boksOverskrift}> Informasjon om ressursen </p>

            <div className={classes.tekstFelt1}>
              <RessursTittelInput
                propValueTextField1={valueTextField1}
                propHandleTextField1Change={handleTextField1Change}
              />
            </div>

            <div className={classes.tekstFelt2}>
              <RessursBeskrivelseInput
                propValueTextField2={valueTextField2}
                propHandleTextField2Change={handleTextField2Change}
              />
            </div>

            <div className={classes.tekstFelt3}>
              <RessursRettighetsBeskrivelseInput
                propValueTextField3={valueTextField3}
                propHandleTextField3Change={handleTextField3Change}
              />
            </div>

            <div className={classes.valgmeny1}>
              <RessursSektorValg
                propValueValg1={valueValg1}
                propHandleValg1Change={handleValg1Change}
              />
            </div>

            <div className={classes.valgmeny2}>
              <RessursTematikkValg
                propValueValg2={valueValg2}
                propHandleValg2Change={handleValg2Change}
              />
            </div>

            <div className={classes.valgmeny3}>
              <RessursTypeValg
                propValueValg3={valueValg3}
                propHandleValg3Change={handleValg3Change}
              />
            </div>

            <div className={classes.knappDiv}>
              <button className={classes.skiftSpraak}>Skift Språk</button>
            </div>
          </div>

          <div className={classes.hoyreHvitBoks}>
            <p className={classes.boksOverskrift}>Sånn ser det ut for brukerne</p>

            <p className={classes.beskrivelseAvRessurs}>
              Data.norge(grå) Norge.no (blå) Altinn (noe annet)
              <br></br> <br></br>
              Trenger ny skisse her.
              <br></br>
            </p>

            <div className={classes.oppdatertRessurs}>
              <h4>Her er oppdatert ressurs:</h4>

              <h5>Tittel = {valueTextField1}</h5>
              <h5>Beskrivelse = {valueTextField2}</h5>
              <h5>Rettighetsbeskrivelse = {valueTextField3}</h5>

              <h5>Sektor = {valueValg1}</h5>
              <h5>Tematisk Område = {valueValg2}</h5>
              <h5>Ressurstype = {valueValg3}</h5>
            </div>

            <div className={classes.knappDiv}>
              <button className={classes.bekreftRessurs}>Bekreft Ressurs</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
