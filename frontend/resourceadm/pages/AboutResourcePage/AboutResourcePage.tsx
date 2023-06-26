import React, { useState } from 'react';
import classes from './AboutResourcePage.module.css';
import { Select, TextField, TextArea, Button } from '@digdir/design-system-react';
import { Switch } from 'resourceadm/components/Switch';
import {
  resourceSectorsMockOptions,
  resourceThematicAreaMockOptions,
  resourceTypeMockOptions,
} from 'resourceadm/data-mocks/resources';
import { useOnce } from 'resourceadm/hooks/useOnce';
import { get } from 'app-shared/utils/networking';
import { useParams } from 'react-router-dom';
import { getResourceUrlBySelectedContextRepoAndId } from 'resourceadm/utils/backendUrlUtils';

/**
 * Page that displays information about a resource
 */
export const AboutResourcePage = () => {
  // TODO - translation
  // TODO - connect with backend - Get and populate resource

  const { selectedContext, resourceId } = useParams();
  const repo = `${selectedContext}-resources`;

  const [selectedResource, setSelectedResource] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [homepageURL, setHomepageURL] = useState('');
  const [keywords, setKeywords] = useState('');
  const [sectors, setSectors] = useState<string[]>([]);
  const [thematicArea, setThematicArea] = useState<string[]>([]);
  const [delegationText, setDelegationText] = useState('');
  const [showInPublic, setShowInPublic] = useState(false);

  useOnce(() => {
    console.log('Hei');
    console.log(resourceId);
    console.log(repo);
    get(getResourceUrlBySelectedContextRepoAndId(selectedContext, repo, resourceId))
      .then((res) => console.log(res))
      .catch((e) => console.log(e));
  });

  const handleSaveResource = () => {
    // TODO - Create the resource object
    // TODO - Split the keyword string into string aray based on the commas
    // Sectors might look like this: https://data.norge.no/reference-data/eu/data-themes
    // Thematcic area might look like this: https://data.norge.no/reference-data/eu/eurovocs
    // TODO - Validate input
  };

  return (
    <div className={classes.pageWrapper}>
      <h1 className={classes.pageHeader}>Om ressursen</h1>
      <h2 className={classes.subHeader}>Ressurs type</h2>
      <p className={classes.text}>Velg ett alternativ fra listen under</p>
      <div className={classes.inputWrapper}>
        <Select
          options={resourceTypeMockOptions}
          onChange={(e: string) => setSelectedResource(e)}
          value={selectedResource}
          label='Ressurs type'
          hideLabel
        />
      </div>
      <h2 className={classes.subHeader}>Navn på tjenesten</h2>
      <p className={classes.text}>
        Navnet vil synes for brukerne, og bør være beskrivende for hva tjenesten handler om. Pass på
        at navnet er forståelig og gjenkjennbart. Om mulig, bruk nøkkelord som man kan søke etter.
      </p>
      <p className={classes.subTitle}>{'Bokmål (standard)'}</p>
      <div className={classes.inputWrapper}>
        <TextField
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label='Navn på tjenesten'
        />
      </div>
      <h2 className={classes.subHeader}>Beskrivelse</h2>
      <p className={classes.text}>
        Her må du beskrive tjenesten. Teksten kan bli synlig på flere områder på tvers av offentlige
        nettløsninger.
      </p>
      <p className={classes.subTitle}>{'Bokmål (standard)'}</p>
      <div className={classes.inputWrapper}>
        <TextArea
          value={description}
          resize='vertical'
          placeholder='Tekst'
          onChange={(e) => setDescription(e.currentTarget.value)}
          rows={5}
          aria-label='Beskrivelse'
        />
      </div>
      <h2 className={classes.subHeader}>Hjemmeside</h2>
      <p className={classes.text}>Link til nettsiden der tjenesten kan startes av brukeren.</p>
      <div className={classes.inputWrapper}>
        <TextField
          value={homepageURL}
          onChange={(e) => setHomepageURL(e.target.value)}
          aria-label='Hjemmeside'
        />
      </div>
      <h2 className={classes.subHeader}>Nøkkelord</h2>
      <p className={classes.text}>
        {'Skriv nøkkelord for ressursen, separer hvert ord med et komma ","'}
      </p>
      <div className={classes.inputWrapper}>
        <TextField
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          aria-label='Skriv nøkkelord for ressursen, separer hvert ord med et komma ","'
        />
      </div>
      <h2 className={classes.subHeader}>Hvilken sektor er tjenesten relatert til?</h2>
      <p className={classes.text}>En tjeneste kan relateres til flere industrier/sektorer</p>
      {/* TODO - inform user that this is optional */}
      <div className={classes.inputWrapper}>
        <Select
          multiple
          options={resourceSectorsMockOptions}
          onChange={(e) => setSectors(e)}
          value={sectors}
          label='Hvilken sektor er tjenesten relatert til?'
          hideLabel
        />
      </div>
      <h2 className={classes.subHeader}>Hvilke geografiske områder dekker tjenesten?</h2>
      <p className={classes.text}>En tjeneste kan relateres til flere geografiske områder</p>
      <div className={classes.inputWrapper}>
        <Select
          multiple
          options={resourceThematicAreaMockOptions}
          onChange={(e) => setThematicArea(e)}
          value={thematicArea}
          label='Velg tematisk område'
          hideLabel
        />
      </div>
      <h2 className={classes.subHeader}>Delegasjonstekst</h2>
      <p className={classes.text}></p>
      <div className={classes.inputWrapper}>
        <TextField
          value={delegationText}
          onChange={(e) => setDelegationText(e.target.value)}
          aria-label='Delegasjonstekst'
        />
      </div>
      <h2 className={classes.subHeader}>Vis i offentlige kataloger</h2>
      <p className={classes.text}>
        Etter publisering blir ressursen tilgjengelig i kataloger, blant annet i altinn, på norge.no
        og data.norge.no.
      </p>
      <div className={classes.inputWrapper}>
        <Switch isChecked={showInPublic} onToggle={(b: boolean) => setShowInPublic(b)} />
        <p
          className={showInPublic ? classes.toggleTextActive : classes.toggleTextInactive}
        >{`Ressursen ${showInPublic ? 'skal' : 'skal ikke'} vises i offentlige kataloger.`}</p>
      </div>
      <div className={classes.buttonWrapper}>
        <Button onClick={handleSaveResource}>Lagre ressurs</Button>
      </div>
    </div>
  );
};
