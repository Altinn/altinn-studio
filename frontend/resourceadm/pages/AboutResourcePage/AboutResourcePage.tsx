import React, { useRef, useState } from 'react';
import classes from './AboutResourcePage.module.css';
import {
  Select,
  TextField,
  TextArea,
  ErrorMessage,
  Heading,
  Paragraph,
  Label,
} from '@digdir/design-system-react';
import { Switch } from 'resourceadm/components/Switch';
import { useParams } from 'react-router-dom';
import type {
  SupportedLanguageKey,
  ResourceBackend,
  ResourceTypeOption,
  ResourceKeyword,
  ResourceSector,
  ResourceThematic,
  LanguageString,
  Translation,
} from 'resourceadm/types/global';
import { ScreenReaderSpan } from 'resourceadm/components/ScreenReaderSpan';
import { RightTranslationBar } from 'resourceadm/components/RightTranslationBar';

/**
 * The resource type options to be used in the select
 */
const resourceTypeOptions = [
  { value: 'Standard', label: 'Standard' },
  { value: 'System ressurs', label: 'System ressurs' },
  { value: 'Maskinporten skjema', label: 'Maskinporten skjema' },
];

/**
 * Initial value for languages with empty fields
 */
const emptyLangauges: LanguageString = { nb: '', nn: '', en: '' };

type AboutResourcePageProps = {
  /**
   * Flag to decide if all errors should be shown or not
   */
  showAllErrors: boolean;
  /**
   * The metadata for the resource
   */
  resourceData: ResourceBackend;
  /**
   * The list of possible sectors
   */
  sectorsData: ResourceSector[];
  /**
   * The list of possible thematic areas
   */
  thematicData: ResourceThematic[];
  /**
   * Function to be handled when saving the resource
   * @param r the resource
   * @returns void
   */
  onSaveResource: (r: ResourceBackend) => void;
};

/**
 * @component
 *    Page that displays information about a resource
 *
 * @property {boolean}[showAllErrors] - Flag to decide if all errors should be shown or not
 * @property {ResourceBackend}[resourceData] - The metadata for the resource
 * @property {ResourceSector[]}[sectorsData] - The list of possible sectors
 * @property {ResourceThematic[]}[thematicData] - The list of possible thematic areas
 * @property {function}[onSaveResource] - Function to be handled when saving the resource
 *
 * @returns {React.ReactNode} - The rendered component
 */
export const AboutResourcePage = ({
  showAllErrors,
  resourceData,
  sectorsData,
  thematicData,
  onSaveResource,
}: AboutResourcePageProps): React.ReactNode => {
  // TODO - translation
  const { resourceId } = useParams();

  /**
   * ------------ Temporary functions -------------
   * The first one maps keyword to string, and the second from string to keyword
   *
   * TODO - Find out how to handle it in the future
   */
  const mapKeywordsArrayToString = (resourceKeywords: ResourceKeyword[]): string => {
    return resourceKeywords.map((k) => k.word).join(', ');
  };
  const mapKeywordStringToKeywordTypeArray = (keywrodString: string): ResourceKeyword[] => {
    return keywrodString.split(', ').map((val) => ({ language: 'nb', word: val.trim() }));
  };

  // States to store the different input values
  const [resourceType, setResourceType] = useState<ResourceTypeOption>(resourceData.resourceType);
  const [title, setTitle] = useState<SupportedLanguageKey<string>>(
    resourceData.title ?? emptyLangauges
  );
  const [description, setDescription] = useState<SupportedLanguageKey<string>>(
    resourceData.description ?? emptyLangauges
  );
  const [homepage, setHomepage] = useState(resourceData.homepage ?? '');
  const [keywords, setKeywords] = useState(
    resourceData.keywords ? mapKeywordsArrayToString(resourceData.keywords) : ''
  );
  const [sector, setSector] = useState<string[]>(
    resourceData.sector
      ? resourceData.sector.map((s) => sectorsData.find((sd) => sd.code === s).label['nb'])
      : []
  );
  const [thematicArea, setThematicArea] = useState(resourceData.thematicArea ?? '');
  const [rightDescription, setRightDescription] = useState<SupportedLanguageKey<string>>(
    resourceData.rightDescription ?? emptyLangauges
  );
  const [isPublicService, setIsPublicService] = useState(resourceData.isPublicService ?? false);

  // To handle which translation value is shown in the right menu
  const [translationType, setTranslationType] = useState<Translation>('none');

  // To handle the error state of the page
  const [hasResourceTypeError, setHasResourceTypeError] = useState(
    resourceData.resourceType === undefined || resourceData.resourceType === null
  );
  const [hasTitleError, setHasTitleError] = useState(
    resourceData.title === undefined ||
      resourceData.title === null ||
      resourceData.title.nb === '' ||
      resourceData.title.nn === '' ||
      resourceData.title.en === ''
  );
  const [hasDescriptionError, setHasDescriptionError] = useState(
    resourceData.description === undefined ||
      resourceData.description === null ||
      resourceData.description.nb === '' ||
      resourceData.description.nn === '' ||
      resourceData.description.en === ''
  );
  const [hasRightDescriptionError, setHasRightDescriptionError] = useState(
    resourceData.rightDescription === undefined ||
      resourceData.rightDescription === null ||
      resourceData.rightDescription.nb === '' ||
      resourceData.rightDescription.nn === '' ||
      resourceData.rightDescription.en === ''
  );

  // useRefs to handle tabbing between the input elements and the right translation bar
  const rightTranslationBarRef = useRef(null);
  const titleFieldRef = useRef(null);
  const descriptionFieldRef = useRef(null);
  const homePageRef = useRef(null);
  const rightDescriptionRef = useRef(null);
  const isPublicServiceRef = useRef(null);

  /**
   * Function that saves the resource to backend
   */
  const handleSaveResource = () => {
    // Map sectoroption to with label to the sector code - TODO: Language
    const sectorToSave: string[] = sector.map(
      (s) => sectorsData.find((sd) => sd.label['nb'] === s).code
    );

    const editedResourceObject: ResourceBackend = {
      ...resourceData,
      identifier: resourceId,
      resourceType,
      title,
      description,
      keywords: mapKeywordStringToKeywordTypeArray(keywords),
      homepage,
      isPublicService,
      sector: sectorToSave,
      thematicArea,
      rightDescription,
    };

    onSaveResource(editedResourceObject);
  };

  /**
   * Handles the change in the dropdown of resource type. Based on the string
   * selected it updates the resource type with the correct key.
   *
   * @param s the selected string
   */
  const onChangeResourceType = (s: string) => {
    if (s === 'Standard') setResourceType('Default');
    else if (s === 'System ressurs') setResourceType('Systemresource');
    else if (s === 'Maskinporten skjema') setResourceType('MaskinportenSchema');
    else setResourceType(undefined);

    setHasResourceTypeError(
      !(s === 'Standard' || s === 'System ressurs' || s === 'Maskinporten skjema')
    );
  };

  /**
   * Converts the resource type key to the correct displayable string
   *
   * @returns the string to display
   */
  const getResourceTypeAsDisplayableString = () => {
    if (resourceType === 'Default') return 'Standard';
    else if (resourceType === 'Systemresource') return 'System ressurs';
    else if (resourceType === 'MaskinportenSchema') return 'Maskinporten skjema';
    return undefined;
  };

  /**
   * Displays the given text in a warning card
   *
   * @param text the text to display
   */
  const displayWarningCard = (text: string) => {
    return (
      <div className={classes.warningCardWrapper}>
        <ErrorMessage size='small'>{text}</ErrorMessage>
      </div>
    );
  };

  /**
   * Sets the values of the selected field and updates if the error is shown or not.
   *
   * @param value the value typed in the input field
   */
  const handleChangeTranslationValues = (value: LanguageString) => {
    const error = value.nb === '' || value.nn === '' || value.en === '';
    if (translationType === 'title') {
      setHasTitleError(error);
      setTitle(value);
    }
    if (translationType === 'description') {
      setHasDescriptionError(error);
      setDescription(value);
    }
    if (translationType === 'rightDescription') {
      setHasRightDescriptionError(error);
      setRightDescription(value);
    }
  };

  /**
   * Function that handles the tabbing into the right translation bar
   */
  const handleTabKeyIntoRightBar = (e: any) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (rightTranslationBarRef.current) {
        rightTranslationBarRef.current.focus();
      }
    }
  };

  /**
   * Function that handles the leaving of the right translation bar.
   * It sets the ref to the next element on the page so that the
   * navigation feels natural.
   */
  const handleLeaveLastFieldRightBar = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (e.key === 'Tab') {
      if (translationType === 'title') {
        if (descriptionFieldRef.current) {
          e.preventDefault();
          descriptionFieldRef.current.focus();
        }
      }
      if (translationType === 'description') {
        if (homePageRef.current) {
          e.preventDefault();
          homePageRef.current.focus();
        }
      }
      if (translationType === 'rightDescription') {
        if (isPublicServiceRef.current) {
          e.preventDefault();
          isPublicServiceRef.current.focus(null);
        }
      }
    }
  };

  /**
   * Displays the correct content in the right translation bar.
   */
  const displayRightTranslationBar = () => {
    return (
      <div className={classes.rightWrapper}>
        <RightTranslationBar
          title={
            translationType === 'title'
              ? 'Navn på tjenesten'
              : translationType === 'description'
              ? 'Beskrivelse'
              : 'Delgasjonstekst'
          }
          value={
            translationType === 'title'
              ? title
              : translationType === 'description'
              ? description
              : rightDescription
          }
          onChangeValue={handleChangeTranslationValues}
          usesTextArea={translationType === 'description'}
          showErrors={showAllErrors}
          ref={rightTranslationBarRef}
          onLeaveLastField={handleLeaveLastFieldRightBar}
          onBlur={handleSaveResource}
        />
      </div>
    );
  };

  /**
   * Maps the language key to the text
   */
  const getLanguage = (val: 'nb' | 'nn' | 'en') => {
    if (val === 'nb') return 'Bokmål';
    if (val === 'nn') return 'Nynorsk';
    return 'Engelsk';
  };

  /**
   * Gets the correct text to display for input fields with missing value
   *
   * @param val the value
   * @param type the type of the field
   */
  const getMissingInputLanguage = (val: LanguageString, type: string) => {
    const valArr: ('nb' | 'nn' | 'en')[] = [];

    // Add the different languages
    if (val.nb === '') {
      valArr.push('nb');
    }
    if (val.nn === '') {
      valArr.push('nn');
    }
    if (val.en === '') {
      valArr.push('en');
    }

    // Return different messages based on the length
    if (valArr.length === 1) {
      return `Du mangler oversettelse for ${type} på ${getLanguage(valArr[0])}.`;
    }
    if (valArr.length === 2) {
      return `Du mangler oversettelse for ${type} på ${getLanguage(valArr[0])} og
      ${getLanguage(valArr[1])}.`;
    }
    if (valArr.length === 3) {
      return `Du mangler oversettelse for ${type} på ${getLanguage(valArr[0])},
      ${getLanguage(valArr[1])} og ${getLanguage(valArr[2])}.`;
    }
    return '';
  };

  /**
   * Displays the content on the page
   */
  const displayContent = () => {
    return (
      <>
        <Heading size='large' spacing level={1}>
          Om ressursen
        </Heading>
        <Label size='medium' spacing>
          Ressurstype
        </Label>
        <Paragraph short size='small'>
          Velg en ressurstype fra listen under.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Select
            options={resourceTypeOptions}
            onChange={onChangeResourceType}
            value={getResourceTypeAsDisplayableString()}
            label='Ressurstype'
            hideLabel
            onFocus={() => setTranslationType('none')}
            error={showAllErrors && hasResourceTypeError}
            onBlur={handleSaveResource}
          />
          {showAllErrors &&
            hasResourceTypeError &&
            displayWarningCard('Du mangler å legge til ressurstype.')}
        </div>
        <div className={classes.divider} />
        <Label size='medium' spacing>
          Navn på tjenesten (Bokmål)
        </Label>
        <Paragraph size='small'>
          Navnet vil synes for brukerne, og bør være beskrivende for hva tjenesten handler om. Pass
          på at navnet er forståelig og gjenkjennbart.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <TextField
            value={title['nb']}
            onChange={(e) => handleChangeTranslationValues({ ...title, nb: e.target.value })}
            onFocus={() => setTranslationType('title')}
            aria-labelledby='resource-title'
            isValid={!(showAllErrors && hasTitleError && title['nb'] === '')}
            ref={titleFieldRef}
            onKeyDown={handleTabKeyIntoRightBar}
            onBlur={handleSaveResource}
          />
          <ScreenReaderSpan
            id='resource-title'
            label='Navn på tjenesten - Navnet vil synes for brukerne, og bør være beskrivende for hva tjenesten handler om. Pass på at navnet er forståelig og gjenkjennbart.'
          />
          {showAllErrors &&
            hasTitleError &&
            displayWarningCard(getMissingInputLanguage(title, 'tittel'))}
        </div>
        <div className={classes.divider} />
        <Label size='medium' spacing>
          Beskrivelse (Bokmål)
        </Label>
        <Paragraph size='small'>
          Her må du beskrive tjenesten. Teksten kan bli synlig på flere områder på tvers av
          offentlige nettløsninger.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <TextArea
            value={description['nb']}
            resize='vertical'
            onChange={(e) => {
              handleChangeTranslationValues({ ...description, nb: e.currentTarget.value });
            }}
            onFocus={() => setTranslationType('description')}
            rows={5}
            aria-labelledby='resource-description'
            isValid={!(showAllErrors && hasDescriptionError && description['nb'] === '')}
            ref={descriptionFieldRef}
            onKeyDown={handleTabKeyIntoRightBar}
            onBlur={handleSaveResource}
          />
          <ScreenReaderSpan
            id='resource-description'
            label='Beskrivelse - Her må du beskrive tjenesten. Teksten kan bli synlig på flere områder på tvers av offentlige nettløsninger.'
          />
          {showAllErrors &&
            hasDescriptionError &&
            displayWarningCard(getMissingInputLanguage(description, 'beskrivelse'))}
        </div>
        {/* TODO - Find out if 'Tilgjengelig språk' should be inserted here */}
        <div className={classes.divider} />
        <Label size='medium' spacing>
          Hjemmeside
        </Label>
        <Paragraph short size='small'>
          Lenke til informasjon om hvor sluttbruker kan finne tjenesten og informasjon om den.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <TextField
            value={homepage}
            onChange={(e) => setHomepage(e.target.value)}
            aria-labelledby='resource-homepage'
            onFocus={() => setTranslationType('none')}
            ref={homePageRef}
            onBlur={handleSaveResource}
          />
          <ScreenReaderSpan
            id='resource-homepage'
            label='Hjemmeside - Lenke til informasjon om hvor sluttbruker kan finne tjenesten og informasjon om den.'
          />
        </div>
        <div className={classes.divider} />
        <Label size='medium' spacing>
          Nøkkelord
        </Label>
        <Paragraph size='small'>
          {
            'Legg til nøkkelord for ressursen, separer hvert ord med et komma ",". Eksempler er ord som er enkle å søke på.'
          }
        </Paragraph>
        <div className={classes.inputWrapper}>
          <TextField
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            aria-labelledby='resource-keywords'
            onFocus={() => setTranslationType('none')}
            onBlur={handleSaveResource}
          />
          <ScreenReaderSpan
            id='resource-keywords'
            label='Nøkkelord - Legg til nøkkelord for ressursen, separer hvert ord med et komma ",". Eksempler er ord som er enkle å søke på.'
          />
        </div>
        <div className={classes.divider} />
        <Label size='medium' spacing>
          Sektor
        </Label>
        <Paragraph size='small'>
          Velg hvilken sektor(er) tjenesten skal relateres til. En tjeneste kan relateres til flere
          industrier/sektorer.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Select
            multiple
            // TODO - Language
            options={sectorsData.map((sd) => ({ value: sd.label['nb'], label: sd.label['nb'] }))}
            onChange={(e) => setSector(e)}
            value={sector}
            label='Sektor - Velg hvilken sektor(er) tjenesten skal relateres til. En tjeneste kan relateres til flere industrier/sektorer.'
            hideLabel
            onFocus={() => setTranslationType('none')}
            onBlur={handleSaveResource}
          />
        </div>
        <div className={classes.divider} />
        <Label size='medium' spacing>
          Tematisk område
        </Label>
        <Paragraph size='small'>
          Velg hvilket tematisk område tjenesten dekker. En tjeneste kan relateres til et tematisk
          område.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Select
            options={thematicData.map((td) => ({ value: td.uri, label: td.uri }))}
            onChange={(e: string) => setThematicArea(e)}
            value={thematicArea}
            label='Tematisk område - Velg hvilket tematisk område tjenesten dekker. En tjeneste kan relateres til et tematisk område.'
            hideLabel
            onFocus={() => setTranslationType('none')}
            onBlur={handleSaveResource}
          />
        </div>
        <div className={classes.divider} />
        <Label size='medium' spacing>
          Delegasjonstekst
        </Label>
        <Paragraph size='small'>
          Delegeringsteksten forklarer sluttbruker hvilke rettigheter som delegeres og hva mottaker
          av rettigheter kan utføre på vegne av den som han har fått rettighet for.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <TextField
            value={rightDescription['nb']}
            onChange={(e) => setRightDescription({ ...rightDescription, nb: e.target.value })}
            aria-labelledby='resource-delegationtext'
            onFocus={() => setTranslationType('rightDescription')}
            ref={rightDescriptionRef}
            onKeyDown={handleTabKeyIntoRightBar}
            onBlur={handleSaveResource}
            isValid={!(showAllErrors && hasRightDescriptionError && rightDescription['nb'] === '')}
          />
          <ScreenReaderSpan
            id='resource-delegationtext'
            label='Delegasjonstekst - Delegeringsteksten forklarer sluttbruker hvilke rettigheter som delegeres og hva mottaker av rettigheter kan utføre på vegne av den som han har fått rettighet for'
          />
          {showAllErrors &&
            hasRightDescriptionError &&
            displayWarningCard(getMissingInputLanguage(rightDescription, 'delegasjonstekst'))}
        </div>
        <div className={classes.divider} />
        <Label size='medium' spacing>
          Vis i offentlige kataloger
        </Label>
        <Paragraph short size='small'>
          Etter publisering blir ressursen tilgjengelig i kataloger, blant annet i altinn, på
          norge.no og data.norge.no.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Switch
            isChecked={isPublicService}
            onToggle={(b: boolean) => setIsPublicService(b)}
            onFocus={() => setTranslationType('none')}
            ref={isPublicServiceRef}
            onBlur={handleSaveResource}
          />
          <p
            className={isPublicService ? classes.toggleTextActive : classes.toggleTextInactive}
          >{`Ressursen ${isPublicService ? 'skal' : 'skal ikke'} vises i offentlige kataloger.`}</p>
        </div>
      </>
    );
  };

  return (
    <div className={classes.wrapper}>
      <div className={classes.pageWrapper}>{displayContent()}</div>
      {translationType !== 'none' && displayRightTranslationBar()}
    </div>
  );
};
