import React, { useState } from 'react';
import classes from './AboutResourcePage.module.css';
import { Select, TextField, TextArea, Button } from '@digdir/design-system-react';
import { Switch } from 'resourceadm/components/Switch';
import { resourceTypeMockOptions } from 'resourceadm/data-mocks/resources';

/**
 * Page that displays information about a resource
 */
export const AboutResourcePage = () => {
  // TODO - translation
  // TODO - connect with backend

  const [selectedResource, setSelectedResource] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [homepageURL, setHomepageURL] = useState('');
  const [showInPublic, setShowInPublic] = useState(false);

  return (
    <div className={classes.pageWrapper}>
      <h1 className={classes.pageHeader}>Om ressursen</h1>
      <h2 className={classes.subHeader}>Hva slags ressurs ønsker du å registrere</h2>
      <p className={classes.text}>Velg ett alternativ fra listen under</p>
      <div className={classes.inputWrapper}>
        <Select
          options={resourceTypeMockOptions}
          onChange={(e: string) => setSelectedResource(e)}
          value={selectedResource}
          label='Hva slags ressurs ønsker du å registrere?'
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
      <h2 className={classes.subHeader}>Vis i offentlige kataloger</h2>
      <p className={classes.text}>
        Etter publisering blir ressursen tilgjengelig i kataloger, blant annet i altinn, på norge.no
        og data.norge.no.
      </p>
      <div className={classes.inputWrapper}>
        <Switch isChecked={showInPublic} onToggle={(b: boolean) => setShowInPublic(b)} />
        <p
          className={showInPublic ? classes.toggleTextActive : classes.toggleTextInActive}
        >{`Ressursen ${showInPublic ? 'skal' : 'skal ikke'} vises i offentlige kataloger.`}</p>
      </div>
      <div className={classes.buttonWrapper}>
        <Button onClick={() => {}}>Lagre ressurs</Button>
      </div>
    </div>
  );
};
