import React, { useState } from 'react';
import classes from './AboutResourcePage.module.css';
import {
  Select,
  TextField,
  TextArea,
  Button,
  ErrorMessage,
  Heading,
  Paragraph,
  Label,
} from '@digdir/design-system-react';
import { Switch } from 'resourceadm/components/Switch';
import { useParams } from 'react-router-dom';
import {
  SupportedLanguageKey,
  ResourceBackendType,
  ResourceTypeOptionType,
  ResourceKeywordType,
  ResourceSectorType,
  ResourceThematicType,
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
const emptyLangauges: LanguageStringType = { nb: '', nn: '', en: '' };

export interface LanguageStringType {
  nb?: string;
  nn?: string;
  en?: string;
}

interface Props {
  showAllErrors: boolean;
  resourceData: ResourceBackendType;
  sectorsData: ResourceSectorType[];
  thematicData: ResourceThematicType[];
  onSaveResource: (r: ResourceBackendType) => void;
}

/**
 * Page that displays information about a resource
 *
 * @param props.showAllErrors flag to decide if all errors should be shown or not
 * @param props.resourceData the metadata for the resource
 * @param props.sectorsData the list of possible sectors
 * @param props.thematicData the list of possible thematic areas
 * @param props.onSaveResource function to be handled when saving the resource
 */
export const AboutResourcePage = ({
  showAllErrors,
  resourceData,
  sectorsData,
  thematicData,
  onSaveResource,
}: Props) => {
  // TODO - translation
  const { resourceId } = useParams();

  /**
   * ------------ Temporary functions -------------
   * The first one maps keyword to string, and the second from string to keyword
   *
   * TODO - Find out how to handle it in the future
   */
  const mapKeywordsArrayToString = (resourceKeywords: ResourceKeywordType[]): string => {
    return resourceKeywords.map((k) => k.word).join(', ');
  };
  const mapKeywordStringToKeywordTypeArray = (keywrodString: string): ResourceKeywordType[] => {
    return keywrodString.split(', ').map((val) => ({ language: 'nb', word: val.trim() }));
  };

  // States to store the different input values
  const [resourceType, setResourceType] = useState<ResourceTypeOptionType>(
    resourceData.resourceType
  );
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
  const [translationType, setTranslationType] = useState<
    'none' | 'title' | 'description' | 'rightDescription'
  >('none');

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

  /**
   * Function that saves the resource to backend
   */
  const handleSaveResource = () => {
    // Map sectoroption to with label to the sector code - TODO: Language
    const sectorToSave: string[] = sector.map(
      (s) => sectorsData.find((sd) => sd.label['nb'] === s).code
    );

    const editedResourceObject: ResourceBackendType = {
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
  const handleChangeTranslationValues = (value: LanguageStringType) => {
    if (translationType === 'title') {
      setHasTitleError(value.nb === '' || value.nn === '' || value.en === '');
      setTitle(value);
    }
    if (translationType === 'description') {
      setHasDescriptionError(value.nb === '' || value.nn === '' || value.en === '');
      setDescription(value);
    }
    if (translationType === 'rightDescription') {
      setRightDescription(value);
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
        />
      </div>
    );
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
        <Heading size='xsmall' spacing level={2}>
          Ressurs type
        </Heading>
        <Paragraph short size='small'>
          Velg ett alternativ fra listen under
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Select
            options={resourceTypeOptions}
            onChange={onChangeResourceType}
            value={getResourceTypeAsDisplayableString()}
            label='Ressurs type'
            hideLabel
            onFocus={() => setTranslationType('none')}
            error={showAllErrors && hasResourceTypeError}
          />
          {showAllErrors &&
            hasResourceTypeError &&
            displayWarningCard('Du må legge til en ressurs type')}
        </div>
        <div className={classes.divider} />
        <Heading size='xsmall' spacing level={2}>
          Navn på tjenesten
        </Heading>
        <Paragraph short size='small'>
          Navnet vil synes for brukerne, og bør være beskrivende for hva tjenesten handler om. Pass
          på at navnet er forståelig og gjenkjennbart. Om mulig, bruk nøkkelord som man kan søke
          etter.
        </Paragraph>
        <Label size='small'>{'Bokmål (standard)'}</Label>
        <div className={classes.inputWrapper}>
          <TextField
            value={title['nb']}
            onChange={(e) => handleChangeTranslationValues({ ...title, nb: e.target.value })}
            onFocus={() => setTranslationType('title')}
            aria-labelledby='resource-titel'
            isValid={!(showAllErrors && hasTitleError && title['nb'] === '')}
          />
          <ScreenReaderSpan id='resource-titel' label='Navn på tjenesten' />
          {showAllErrors &&
            hasTitleError &&
            displayWarningCard('Du må legge til en tittel for Bokmål, Nynorsk, og Engelsk')}
        </div>
        <div className={classes.divider} />
        <Heading size='xsmall' spacing level={2}>
          Beskrivelse
        </Heading>
        <Paragraph short size='small'>
          Her må du beskrive tjenesten. Teksten kan bli synlig på flere områder på tvers av
          offentlige nettløsninger.
        </Paragraph>
        <Label size='small'>{'Bokmål (standard)'}</Label>
        <div className={classes.inputWrapper}>
          <TextArea
            value={description['nb']}
            resize='vertical'
            placeholder='Tekst'
            onChange={(e) => {
              handleChangeTranslationValues({ ...description, nb: e.currentTarget.value });
            }}
            onFocus={() => setTranslationType('description')}
            rows={5}
            aria-labelledby='resource-description'
            isValid={!(showAllErrors && hasDescriptionError && description['nb'] === '')}
          />
          <ScreenReaderSpan id='resource-description' label='Beskrivelse' />
          {showAllErrors &&
            hasDescriptionError &&
            displayWarningCard('Du må legge til en beskrivelse for Bokmål, Nynorsk, og Engelsk')}
        </div>
        {/* TODO - Find out if 'Tilgjengelig språk' should be inserted here */}
        <div className={classes.divider} />
        <Heading size='xsmall' spacing level={2}>
          Hjemmeside
        </Heading>
        <Paragraph short size='small'>
          Link til nettsiden der tjenesten kan startes av brukeren.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <TextField
            value={homepage}
            onChange={(e) => setHomepage(e.target.value)}
            aria-labelledby='resource-homepage'
            onFocus={() => setTranslationType('none')}
          />
          <ScreenReaderSpan id='resource-homepage' label='Hjemmeside' />
        </div>
        <div className={classes.divider} />
        <Heading size='xsmall' spacing level={2}>
          Nøkkelord
        </Heading>
        <Paragraph short size='small'>
          {'Skriv nøkkelord for ressursen, separer hvert ord med et komma ","'}
        </Paragraph>
        <div className={classes.inputWrapper}>
          <TextField
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            aria-labelledby='resource-keywords'
            onFocus={() => setTranslationType('none')}
          />
          <ScreenReaderSpan id='resource-keywords' label='Nøkkelord' />
        </div>
        <div className={classes.divider} />
        <Heading size='xsmall' spacing level={2}>
          Hvilken sektor er tjenesten relatert til?
        </Heading>
        <Paragraph short size='small'>
          En tjeneste kan relateres til flere industrier/sektorer
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Select
            multiple
            // TODO - Language
            options={sectorsData.map((sd) => ({ value: sd.label['nb'], label: sd.label['nb'] }))}
            onChange={(e) => setSector(e)}
            value={sector}
            label='Hvilken sektor er tjenesten relatert til?'
            hideLabel
            onFocus={() => setTranslationType('none')}
          />
        </div>
        <div className={classes.divider} />
        <Heading size='xsmall' spacing level={2}>
          Hvilket tematiske område dekker tjenesten?
        </Heading>
        <Paragraph short size='small'>
          En tjeneste kan relateres til et tematisk område
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Select
            options={thematicData.map((td) => ({ value: td.uri, label: td.uri }))}
            onChange={(e: string) => setThematicArea(e)}
            value={thematicArea}
            label='Velg tematisk område'
            hideLabel
            onFocus={() => setTranslationType('none')}
          />
        </div>
        <div className={classes.divider} />
        <Heading size='xsmall' spacing level={2}>
          Delegasjonstekst
        </Heading>
        <div className={classes.inputWrapper}>
          <TextField
            value={rightDescription['nb']}
            onChange={(e) => setRightDescription({ ...rightDescription, nb: e.target.value })}
            aria-labelledby='resource-delegationtext'
            onFocus={() => setTranslationType('rightDescription')}
          />
          <ScreenReaderSpan id='resource-delegationtext' label='Delegasjonstekst' />
        </div>
        <div className={classes.divider} />
        <Heading size='xsmall' spacing level={2}>
          Vis i offentlige kataloger
        </Heading>
        <Paragraph short size='small'>
          Etter publisering blir ressursen tilgjengelig i kataloger, blant annet i altinn, på
          norge.no og data.norge.no.
        </Paragraph>
        <div className={classes.inputWrapper}>
          <Switch
            isChecked={isPublicService}
            onToggle={(b: boolean) => setIsPublicService(b)}
            onFocus={() => setTranslationType('none')}
          />
          <p
            className={isPublicService ? classes.toggleTextActive : classes.toggleTextInactive}
          >{`Ressursen ${isPublicService ? 'skal' : 'skal ikke'} vises i offentlige kataloger.`}</p>
        </div>
        <div className={classes.buttonWrapper}>
          {/* TODO - Find out if this button should be here, and if a success message should be shown */}
          <Button onClick={handleSaveResource}>Lagre ressurs</Button>
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
