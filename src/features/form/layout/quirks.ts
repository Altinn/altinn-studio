import type { CompExternal, CompTypes, ILayouts } from 'src/layout/layout';

/**
 * After the hierarchy generator rewrite, some apps in production broke badly because of misconfiguration. To make sure
 * we can still ship the rewrite, we need to apply some quirks/fixes to some layouts. This function applies those quirks
 * and warns about them.
 */
export function applyLayoutQuirks(layouts: ILayouts, layoutSetId: string) {
  const quirk = quirks[`${window.org}/${window.app}/${layoutSetId}`];
  if (!quirk) {
    return layouts;
  }

  // Start off with a copy of the entire layouts that we'll throw away if anything fails
  const clone = structuredClone(layouts);

  try {
    quirk.verifyAndApply(clone);
    window.logError(
      `Layout quirk(s) applied: \n - ${quirk.logMessages.join('\n - ')}.\n` +
        `Please fix your layout configuration. These workarounds will be removed in the future.`,
    );
  } catch (_err) {
    return layouts;
  }

  // If we got here, the quirks were applied successfully
  return clone;
}

interface QuirkDef {
  verifyAndApply: (layouts: ILayouts) => void;
  logMessages: string[];
}

// Key format: 'org/app/layoutSetId' => QuirkDef
export const quirks: { [key: string]: QuirkDef } = {
  'digdir/tilskudd-dig-delt-komp/form': {
    verifyAndApply: (layouts) => {
      assert(layouts['03Description']![1].id === 'descriptionHeader');
      assert(layouts['pdfReceipt']![7].id === 'descriptionHeader');

      layouts['pdfReceipt']![7].id = 'descriptionHeaderPdfSummary';
    },
    logMessages: [`Renamed duplicate ID 'descriptionHeader' in 'pdfReceipt' layout to 'descriptionHeaderPdfSummary'`],
  },
  'dmf/bergrettigheter-fristilling-un/form': {
    verifyAndApply(layouts) {
      const copyPasteSequence = [
        'tittelRapport',
        'raportplikt1',
        'raportplikt2',
        'raportplikt3',
        'raportplikt4',
        'raportplikt5',
        'tittelSluttRapport',
        'sluttraport',
        'tittelPorve',
        'Provemateriale',
        'tittelKarantere',
        'Karantene',
      ];

      assertSequenceOfIds(layouts, 'Oppsummering', copyPasteSequence, 6);
      assertSequenceOfIds(layouts, 'Raportering', copyPasteSequence);
      assert(layouts['Innsender']!.at(-1)!.id === 'knappNavigasjonForside');
      assert(layouts['Raportering']!.at(-1)!.id === 'knappNavigasjonForside');

      for (const idx of copyPasteSequence.keys()) {
        layouts['Oppsummering']![6 + idx].id += 'Oppsummering';
      }
      layouts['Innsender']!.at(-1)!.id = 'knappNavigasjonForsideInnsender';
    },
    logMessages: [
      `Renamed duplicate ID 'tittelRapport' (+ subsequent copy-pasted components)`,
      `Renamed duplicate ID 'knappNavigasjonForside' components.`,
    ],
  },
  'dsb/bekymring-forbrukertjenester/form': {
    verifyAndApply(layouts) {
      assert(layouts['01Introduction']!.at(-1)!.id === 'navButtons');
      assert(layouts['02ContactInfo']!.at(-1)!.id === 'navButtons');
      assert(layouts['03ProductInformation']!.at(-1)!.id === 'navButtons');
      assert(layouts['04Incident']!.at(-1)!.id === 'navButtons');
      assert(layouts['05Remarks']!.at(-1)!.id === 'navButtons');
      assert(layouts['06Attachments']!.at(-1)!.id === 'navButtons');
      const sequenceOfIds = [
        'contactInfo-group',
        'contactInfoFirstName-summary',
        'contactInfoLastName-summary',
        'contactInfoPhone-summary',
        'contactInfoEmail-summary',
        'productInfo-group',
        'productInfoCategory-summary',
        'productInfoCategoryDescription-summary',
        'productInfoProvider-summary',
        'productInfoLocation-summary',
        'productInfoOtherInformation-summary',
        'productInfoOtherInformationRequired-summary',
        'incident-group',
        'incidentLocation-summary',
        'incidentDate-summary',
        'incidentInformation-summary',
        'incidentCause-summary',
        'incidentPersonInjury-summary',
        'incidentPersonInjuryConsequence-summary',
        'incidentDescription-summary',
        'incidentDescriptionRequired-summary',
        'incidentVictimGroup-summary',
        'remarks-group',
        'remarks-summary',
        'attachmentsHeader-summary',
        'attachmentsUpload-summary',
      ];
      assertSequenceOfIds(layouts, '99Summary', sequenceOfIds, 2);
      assertSequenceOfIds(layouts, 'pdfReceipt', sequenceOfIds, 1);

      // Remove children that does not exist ('incidentVictimGroupHeader-summary')
      assert(layouts['99Summary']!.at(14)!.id === 'incident-group');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert((layouts['99Summary']!.at(14) as any).children[6] === 'incidentVictimGroupHeader-summary');
      assert(layouts['pdfReceipt']!.at(13)!.id === 'incident-group');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert((layouts['pdfReceipt']!.at(13) as any).children[6] === 'incidentVictimGroupHeader-summary');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (layouts['99Summary']!.at(14) as any)!.children.splice(6, 1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (layouts['pdfReceipt']!.at(13) as any)!.children.splice(6, 1);

      layouts['01Introduction']!.at(-1)!.id = 'navButtons1';
      layouts['02ContactInfo']!.at(-1)!.id = 'navButtons2';
      layouts['03ProductInformation']!.at(-1)!.id = 'navButtons3';
      layouts['04Incident']!.at(-1)!.id = 'navButtons4';
      layouts['05Remarks']!.at(-1)!.id = 'navButtons5';
      layouts['06Attachments']!.at(-1)!.id = 'navButtons6';

      for (const idx of sequenceOfIds.keys()) {
        const comp = layouts['99Summary']![2 + idx];
        comp.id += 'SummaryPage';
        if (sequenceOfIds[idx].endsWith('-group') && comp.type === 'Group') {
          // Update child references as well
          for (const childIdx of comp.children!.keys()) {
            comp.children![childIdx] += 'SummaryPage';
          }
        }
      }
    },
    logMessages: [
      'Renamed duplicate IDs for NavigationButtons on page 1-6',
      'Renamed components copy-pasted between Summary and pdfReceipt pages',
      `Removed child that does not exist from 'incident-group'`,
    ],
  },
  'dsb/elvirksomhet/form': {
    verifyAndApply(layouts) {
      assert(layouts['02ContactInfo']!.at(-1)!.id === 'navButtons');
      assert(layouts['03EntityInfo']!.at(-1)!.id === 'navButtons');
      assert(layouts['04Tasks']!.at(-1)!.id === 'navButtons');
      assert(layouts['05ProfessionalResponsibles']!.at(-1)!.id === 'navButtons');
      assert(layouts['06FacilityAndEquipmentTypes']!.at(-1)!.id === 'navButtons');

      assert(layouts['07Summary']!.at(21)!.id === 'tasks-group');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      assert((layouts['07Summary']!.at(21) as any).children[1] === 'tasksOptionsDLE-summary');
      assert(layouts['07Summary']!.find((c) => c.id === 'tasksOptionsDLE-summary') === undefined);

      layouts['02ContactInfo']!.at(-1)!.id = 'navButtons2';
      layouts['03EntityInfo']!.at(-1)!.id = 'navButtons3';
      layouts['04Tasks']!.at(-1)!.id = 'navButtons4';
      layouts['05ProfessionalResponsibles']!.at(-1)!.id = 'navButtons5';
      layouts['06FacilityAndEquipmentTypes']!.at(-1)!.id = 'navButtons6';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (layouts['07Summary']!.at(21) as any).children.splice(1, 1);
    },
    logMessages: [
      'Renamed duplicate IDs for NavigationButtons on page 2-6',
      `In 'tasks-group', removed reference to 'tasksOptionsDLE-summary' which does not exist`,
    ],
  },
  'dsb/meldeplikt-forbrukertjenester/form': {
    verifyAndApply(layouts) {
      assert(layouts['01Introduction']!.at(-1)!.id === 'navButtons');
      assert(layouts['02EntityInfo']!.at(-1)!.id === 'navButtons');
      assert(layouts['03ProductInformation']!.at(-1)!.id === 'navButtons');
      assert(layouts['04Risk']!.at(-1)!.id === 'navButtons');
      assert(layouts['05Measures']!.at(-1)!.id === 'navButtons');
      assert(layouts['06Attachments']!.at(-1)!.id === 'navButtons');

      const copyPastedIds = [
        'entityInfo-group',
        'entityInfoOrganizationName-summary',
        'entityInfoOrganizationNumber-summary',
        'entityInfoAdress-summary',
        'entityInfoAdressPostalCode-summary',
        'entityInfoAdressPostalCity-summary',
        'entityInfoContactHeader-summary',
        'entityInfoFirstName-summary',
        'entityInfoLastName-summary',
        'entityInfoPhone-summary',
        'entityInfoEmail-summary',
        'productInfo-group',
        'productInfoCategory-summary',
        'productInfoCategoryDescription-summary',
        'productInfoHowLong-summary',
        'productInfoHowMany-summary',
        'productInfoLocation-summary',
        'productInfoOtherInformation-summary',
        'risk-group',
        'riskRisks-summary',
        'riskKnowledge-summary',
        'riskIncidentCount-summary',
        'riskDescription-summary',
        'riskKnowledgeDescription-summary',
        'riskLevel-summary',
        'measures-group',
        'measuresMeasures-summary',
        'measuresDescription-summary',
        'attachmentsHeader-summary',
        'attachmentsUpload-summary',
      ];

      assertSequenceOfIds(layouts, '07Summary', copyPastedIds, 2);
      assertSequenceOfIds(layouts, 'pdfReceipt', copyPastedIds, 1);

      layouts['01Introduction']!.at(-1)!.id = 'navButtons1';
      layouts['02EntityInfo']!.at(-1)!.id = 'navButtons2';
      layouts['03ProductInformation']!.at(-1)!.id = 'navButtons3';
      layouts['04Risk']!.at(-1)!.id = 'navButtons4';
      layouts['05Measures']!.at(-1)!.id = 'navButtons5';
      layouts['06Attachments']!.at(-1)!.id = 'navButtons6';

      for (const idx of copyPastedIds.keys()) {
        const comp = layouts['07Summary']![2 + idx];
        comp.id += 'SummaryPage';
        if (copyPastedIds[idx].endsWith('-group') && comp.type === 'Group') {
          // Update child references as well
          for (const childIdx of comp.children!.keys()) {
            comp.children![childIdx] += 'SummaryPage';
          }
        }
      }
    },
    logMessages: [
      'Renamed duplicate IDs for NavigationButtons on page 1-6',
      'Renamed components copy-pasted between Summary and pdfReceipt pages',
    ],
  },
  'dsb/melding-om-sikkerhetsraadgiver/form': {
    verifyAndApply(layouts) {
      assert(layouts['99Summary']!.at(4)!.id === 'safetyAdvisersSummary');
      assert(layouts['pdfReceipt']!.at(3)!.id === 'safetyAdvisersSummary');

      assert(layouts['99Summary']!.at(5)!.id === 'termsSummary');
      assert(layouts['pdfReceipt']!.at(4)!.id === 'termsSummary');

      layouts['99Summary']!.at(4)!.id += 'SummaryPage';
      layouts['99Summary']!.at(5)!.id += 'SummaryPage';
    },
    logMessages: [
      `Renamed duplicate ID 'safetyAdvisersSummary' in '99Summary' layout to 'safetyAdvisersSummarySummaryPage'`,
      `Renamed duplicate ID 'termsSummary' in '99Summary' layout to 'termsSummarySummaryPage'`,
    ],
  },
  'krt/krt-1008a-1/form': {
    verifyAndApply(layouts) {
      assert(layouts['5.Balanserapport']!.at(51)!.id === '5B');
      assert(layouts['5B.Prinsippnote']!.at(0)!.id === '5B');
      assert(layouts['5B.Prinsippnote']!.at(1)!.id === '5-5-id');
      assert(layouts['5B.Prinsippnote']!.at(2)!.id === '5-5-1-id');

      layouts['5.Balanserapport']!.at(51)!.id += 'Balanserapport';
      layouts['5B.Prinsippnote']!.at(1)!.id += 'B';
      layouts['5B.Prinsippnote']!.at(2)!.id += 'B';
    },
    logMessages: [
      `Renamed duplicate ID '5B' in '5.Balanserapport' layout to '5BBalanserapport'`,
      `Renamed duplicate ID '5-5-id' in '5B.Prinsippnote' layout to '5-5-idB'`,
      `Renamed duplicate ID '5-5-1-id' in '5B.Prinsippnote' layout to '5-5-1-idB'`,
    ],
  },
  'dsb/siv-1005-svar-rek/form': {
    verifyAndApply(layouts) {
      removeChildThatDoesNotExist(layouts, 'statementForApplicationPdfReceipt', 'pdf-personalia-group', 'Group');
    },
    logMessages: [
      `Removed child 'statementForApplicationPdfReceipt' from component 'pdf-personalia-group' which does not exist`,
    ],
  },
  'dsb/siv-1013-svar-kurs/form': {
    verifyAndApply(layouts) {
      removeChildThatDoesNotExist(layouts, 'statementForApplicationPdfReceipt', 'pdf-personalia-group', 'Group');
    },
    logMessages: [
      `Removed child 'statementForApplicationPdfReceipt' from component 'pdf-personalia-group' which does not exist`,
    ],
  },
  'dsb/siv-1016-svar-oevelse/form': {
    verifyAndApply(layouts) {
      removeChildThatDoesNotExist(layouts, 'statementForApplicationPdfReceipt', 'pdf-personalia-group', 'Group');
    },
    logMessages: [
      `Removed child 'statementForApplicationPdfReceipt' from component 'pdf-personalia-group' which does not exist`,
    ],
  },
  'krt/krt-1177a-1/form': {
    verifyAndApply: (layouts) => {
      assert(layouts['Summary']![0].id === 'Paragraph-PZVeXz-summary');
      assert(layouts['pdfLayout']![3].id === 'Paragraph-PZVeXz-summary');
      assert(layouts['Summary']![1].id === '1-header-summary');
      assert(layouts['pdfLayout']![4].id === '1-header-summary');
      assert(layouts['Summary']![2].id === '1-1-id-summary');
      assert(layouts['pdfLayout']![5].id === '1-1-id-summary');
      assert(layouts['Summary']![3].id === '1-2-id-summary');
      assert(layouts['pdfLayout']![6].id === '1-2-id-summary');
      assert(layouts['Summary']![4].id === '1-3-id-summary');
      assert(layouts['pdfLayout']![7].id === '1-3-id-summary');
      assert(layouts['Summary']![5].id === '1-4-id-summary');
      assert(layouts['pdfLayout']![8].id === '1-4-id-summary');
      assert(layouts['Summary']![6].id === '1-5-1-id-summary');
      assert(layouts['pdfLayout']![9].id === '1-5-1-id-summary');
      assert(layouts['Summary']![7].id === '1-5-2-id-summary');
      assert(layouts['pdfLayout']![10].id === '1-5-2-id-summary');
      assert(layouts['Summary']![8].id === '2-header-summary');
      assert(layouts['pdfLayout']![11].id === '2-header-summary');
      assert(layouts['Summary']![9].id === '2-1-id-summary');
      assert(layouts['pdfLayout']![12].id === '2-1-id-summary');
      assert(layouts['Summary']![10].id === '2-2-id-summary');
      assert(layouts['pdfLayout']![13].id === '2-2-id-summary');
      assert(layouts['Summary']![11].id === '2-3-1-id-summary');
      assert(layouts['pdfLayout']![14].id === '2-3-1-id-summary');
      assert(layouts['Summary']![12].id === '2-3-2-id-summary');
      assert(layouts['pdfLayout']![15].id === '2-3-2-id-summary');
      assert(layouts['Summary']![13].id === '2-4-id-summary');
      assert(layouts['pdfLayout']![16].id === '2-4-id-summary');
      assert(layouts['Summary']![14].id === '3-header-summary');
      assert(layouts['pdfLayout']![17].id === '3-header-summary');
      assert(layouts['Summary']![15].id === '3-1-id-summary');
      assert(layouts['pdfLayout']![18].id === '3-1-id-summary');
      assert(layouts['Summary']![16].id === '3-2-id-summary');
      assert(layouts['pdfLayout']![19].id === '3-2-id-summary');
      assert(layouts['Summary']![17].id === '3-3-1-id-summary');
      assert(layouts['pdfLayout']![20].id === '3-3-1-id-summary');
      assert(layouts['Summary']![18].id === '3-3-2-id-summary');
      assert(layouts['pdfLayout']![21].id === '3-3-2-id-summary');
      assert(layouts['Summary']![19].id === '3-4-id-summary');
      assert(layouts['pdfLayout']![22].id === '3-4-id-summary');
      assert(layouts['Summary']![20].id === '4-header-summary');
      assert(layouts['pdfLayout']![23].id === '4-header-summary');
      assert(layouts['Summary']![21].id === '4-1-id-summary');
      assert(layouts['pdfLayout']![24].id === '4-1-id-summary');
      assert(layouts['Summary']![22].id === '4-2-id-summary');
      assert(layouts['pdfLayout']![25].id === '4-2-id-summary');
      assert(layouts['Summary']![23].id === '4-3-id-summary');
      assert(layouts['pdfLayout']![26].id === '4-3-id-summary');
      assert(layouts['Summary']![24].id === '4-4-id-summary');
      assert(layouts['pdfLayout']![27].id === '4-4-id-summary');
      assert(layouts['Summary']![25].id === '5-header-summary');
      assert(layouts['pdfLayout']![28].id === '5-header-summary');
      assert(layouts['Summary']![26].id === '5-1-id-summary');
      assert(layouts['pdfLayout']![29].id === '5-1-id-summary');
      assert(layouts['Summary']![27].id === '5-2-id-summary');
      assert(layouts['pdfLayout']![30].id === '5-2-id-summary');
      assert(layouts['Summary']![28].id === '5-3-id-summary');
      assert(layouts['pdfLayout']![31].id === '5-3-id-summary');
      assert(layouts['Summary']![29].id === '5-4-group-summary');
      assert(layouts['pdfLayout']![32].id === '5-4-group-summary');
      assert(layouts['Summary']![30].id === '5-5-group-summary');
      assert(layouts['pdfLayout']![33].id === '5-5-group-summary');
      assert(layouts['Summary']![31].id === '5-group-paragraph-summary');
      assert(layouts['pdfLayout']![34].id === '5-group-paragraph-summary');
      assert(layouts['Summary']![32].id === '6-header-summary');
      assert(layouts['pdfLayout']![35].id === '6-header-summary');
      assert(layouts['Summary']![33].id === '6-1-id-summary');
      assert(layouts['pdfLayout']![36].id === '6-1-id-summary');
      assert(layouts['Summary']![34].id === '6-2-id-summary');
      assert(layouts['pdfLayout']![37].id === '6-2-id-summary');
      assert(layouts['Summary']![35].id === '6-3-id-summary');
      assert(layouts['pdfLayout']![38].id === '6-3-id-summary');
      assert(layouts['Summary']![36].id === '6-4-id-summary');
      assert(layouts['pdfLayout']![39].id === '6-4-id-summary');
      assert(layouts['Summary']![37].id === '6-5-id-summary');
      assert(layouts['pdfLayout']![40].id === '6-5-id-summary');
      assert(layouts['Summary']![38].id === '7-header-summary');
      assert(layouts['pdfLayout']![41].id === '7-header-summary');
      assert(layouts['Summary']![39].id === '7-1-id-summary');
      assert(layouts['pdfLayout']![42].id === '7-1-id-summary');
      assert(layouts['Summary']![40].id === '7-2-id-summary');
      assert(layouts['pdfLayout']![43].id === '7-2-id-summary');
      assert(layouts['Summary']![41].id === '7-3-id-summary');
      assert(layouts['pdfLayout']![44].id === '7-3-id-summary');
      assert(layouts['Summary']![42].id === '7-4-id-summary');
      assert(layouts['pdfLayout']![45].id === '7-4-id-summary');

      layouts['pdfLayout']![3].id = 'Paragraph-PZVeXz-summaryDuplicate';
      layouts['pdfLayout']![4].id = '1-header-summaryDuplicate';
      layouts['pdfLayout']![5].id = '1-1-id-summaryDuplicate';
      layouts['pdfLayout']![6].id = '1-2-id-summaryDuplicate';
      layouts['pdfLayout']![7].id = '1-3-id-summaryDuplicate';
      layouts['pdfLayout']![8].id = '1-4-id-summaryDuplicate';
      layouts['pdfLayout']![9].id = '1-5-1-id-summaryDuplicate';
      layouts['pdfLayout']![10].id = '1-5-2-id-summaryDuplicate';
      layouts['pdfLayout']![11].id = '2-header-summaryDuplicate';
      layouts['pdfLayout']![12].id = '2-1-id-summaryDuplicate';
      layouts['pdfLayout']![13].id = '2-2-id-summaryDuplicate';
      layouts['pdfLayout']![14].id = '2-3-1-id-summaryDuplicate';
      layouts['pdfLayout']![15].id = '2-3-2-id-summaryDuplicate';
      layouts['pdfLayout']![16].id = '2-4-id-summaryDuplicate';
      layouts['pdfLayout']![17].id = '3-header-summaryDuplicate';
      layouts['pdfLayout']![18].id = '3-1-id-summaryDuplicate';
      layouts['pdfLayout']![19].id = '3-2-id-summaryDuplicate';
      layouts['pdfLayout']![20].id = '3-3-1-id-summaryDuplicate';
      layouts['pdfLayout']![21].id = '3-3-2-id-summaryDuplicate';
      layouts['pdfLayout']![22].id = '3-4-id-summaryDuplicate';
      layouts['pdfLayout']![23].id = '4-header-summaryDuplicate';
      layouts['pdfLayout']![24].id = '4-1-id-summaryDuplicate';
      layouts['pdfLayout']![25].id = '4-2-id-summaryDuplicate';
      layouts['pdfLayout']![26].id = '4-3-id-summaryDuplicate';
      layouts['pdfLayout']![27].id = '4-4-id-summaryDuplicate';
      layouts['pdfLayout']![28].id = '5-header-summaryDuplicate';
      layouts['pdfLayout']![29].id = '5-1-id-summaryDuplicate';
      layouts['pdfLayout']![30].id = '5-2-id-summaryDuplicate';
      layouts['pdfLayout']![31].id = '5-3-id-summaryDuplicate';
      layouts['pdfLayout']![32].id = '5-4-group-summaryDuplicate';
      layouts['pdfLayout']![33].id = '5-5-group-summaryDuplicate';
      layouts['pdfLayout']![34].id = '5-group-paragraph-summaryDuplicate';
      layouts['pdfLayout']![35].id = '6-header-summaryDuplicate';
      layouts['pdfLayout']![36].id = '6-1-id-summaryDuplicate';
      layouts['pdfLayout']![37].id = '6-2-id-summaryDuplicate';
      layouts['pdfLayout']![38].id = '6-3-id-summaryDuplicate';
      layouts['pdfLayout']![39].id = '6-4-id-summaryDuplicate';
      layouts['pdfLayout']![40].id = '6-5-id-summaryDuplicate';
      layouts['pdfLayout']![41].id = '7-header-summaryDuplicate';
      layouts['pdfLayout']![42].id = '7-1-id-summaryDuplicate';
      layouts['pdfLayout']![43].id = '7-2-id-summaryDuplicate';
      layouts['pdfLayout']![44].id = '7-3-id-summaryDuplicate';
      layouts['pdfLayout']![45].id = '7-4-id-summaryDuplicate';
    },
    logMessages: [
      `Renamed component id 'Paragraph-PZVeXz-summary' to 'Paragraph-PZVeXz-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '1-header-summary' to '1-header-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '1-1-id-summary' to '1-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '1-2-id-summary' to '1-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '1-3-id-summary' to '1-3-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '1-4-id-summary' to '1-4-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '1-5-1-id-summary' to '1-5-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '1-5-2-id-summary' to '1-5-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '2-header-summary' to '2-header-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '2-1-id-summary' to '2-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '2-2-id-summary' to '2-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '2-3-1-id-summary' to '2-3-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '2-3-2-id-summary' to '2-3-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '2-4-id-summary' to '2-4-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '3-header-summary' to '3-header-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '3-1-id-summary' to '3-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '3-2-id-summary' to '3-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '3-3-1-id-summary' to '3-3-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '3-3-2-id-summary' to '3-3-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '3-4-id-summary' to '3-4-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '4-header-summary' to '4-header-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '4-1-id-summary' to '4-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '4-2-id-summary' to '4-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '4-3-id-summary' to '4-3-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '4-4-id-summary' to '4-4-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '5-header-summary' to '5-header-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '5-1-id-summary' to '5-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '5-2-id-summary' to '5-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '5-3-id-summary' to '5-3-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '5-4-group-summary' to '5-4-group-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '5-5-group-summary' to '5-5-group-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '5-group-paragraph-summary' to '5-group-paragraph-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '6-header-summary' to '6-header-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '6-1-id-summary' to '6-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '6-2-id-summary' to '6-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '6-3-id-summary' to '6-3-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '6-4-id-summary' to '6-4-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '6-5-id-summary' to '6-5-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '7-header-summary' to '7-header-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '7-1-id-summary' to '7-1-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '7-2-id-summary' to '7-2-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '7-3-id-summary' to '7-3-id-summaryDuplicate' on page 'pdfLayout'`,
      `Renamed component id '7-4-id-summary' to '7-4-id-summaryDuplicate' on page 'pdfLayout'`,
    ],
  },
  'lt/flight-hours/form-a': {
    verifyAndApply: (layouts) => {
      assert(layouts['Amount']![0].id === 'Header-RkBLKV');
      assert(layouts['Operator']![0].id === 'Header-RkBLKV');

      layouts['Operator']![0].id = 'Header-RkBLKVDuplicate';
    },
    logMessages: [`Renamed component id 'Header-RkBLKV' to 'Header-RkBLKVDuplicate' on page 'Operator'`],
  },
  'lt/operating-permit/form-a': {
    verifyAndApply: (layouts) => {
      assert(layouts['01.Privacy']![0].id === 'Panel-vQOOQx');
      assert(layouts['08.Confirmation']![0].id === 'Panel-vQOOQx');

      layouts['08.Confirmation']![0].id = 'Panel-vQOOQxDuplicate';
    },
    logMessages: [`Renamed component id 'Panel-vQOOQx' to 'Panel-vQOOQxDuplicate' on page '08.Confirmation'`],
  },
  'pat/forundersokelse/form': {
    verifyAndApply: (layouts) => {
      assert(layouts['2_Request']![0].id === 'request-navbar');
      assert(layouts['Summary']![0].id === 'request-navbar');

      layouts['Summary']![0].id = 'request-navbarDuplicate';
    },
    logMessages: [`Renamed component id 'request-navbar' to 'request-navbarDuplicate' on page 'Summary'`],
  },
  'pat/klagesaker-op/form': {
    verifyAndApply: (layouts) => {
      assert(layouts['01_Contact_information']![0].id === 'role-navigationBar');
      assert(layouts['02_Role']![0].id === 'role-navigationBar');
      assert(layouts['05_Summary']![0].id === 'role-navigationBar');
      assert(layouts['02_Role']![3].id === 'role-agent-group');
      assert(layouts['05_Summary']![2].id === 'role-agent-group');

      layouts['02_Role']![0].id = 'role-navigationBarDuplicate1';
      layouts['05_Summary']![0].id = 'role-navigationBarDuplicate2';
      layouts['05_Summary']![2].id = 'role-agent-groupDuplicate';
    },
    logMessages: [
      `Renamed component id 'role-navigationBar' to 'role-navigationBarDuplicate1' on page '02_Role'`,
      `Renamed component id 'role-navigationBar' to 'role-navigationBarDuplicate2' on page '05_Summary'`,
      `Renamed component id 'role-agent-group' to 'role-agent-groupDuplicate' on page '05_Summary'`,
    ],
  },
  'ssb/ra0825-01/form': {
    verifyAndApply: (layouts) => {
      assert(layouts['S20_Summary']![0].id === 'summary-sidetittel');
      assert(layouts['ra0825_S20_Summary']![0].id === 'summary-sidetittel');
      assert(layouts['S20_Summary']![1].id === 'summary-infotekst');
      assert(layouts['ra0825_S20_Summary']![1].id === 'summary-infotekst');
      assert(layouts['S20_Summary']![2].id === 'ra0825-S01-sammendrag');
      assert(layouts['ra0825_S20_Summary']![2].id === 'ra0825-S01-sammendrag');
      assert(layouts['S20_Summary']![5].id === 'ra0825-S02-sammendrag');
      assert(layouts['ra0825_S20_Summary']![3].id === 'ra0825-S02-sammendrag');
      assert(layouts['S20_Summary']![6].id === 'ra0825-S02-sammendrag-enkeltelement-fra-grid');
      assert(layouts['ra0825_S20_Summary']![4].id === 'ra0825-S02-sammendrag-enkeltelement-fra-grid');
      assert(layouts['S20_Summary']![7].id === 'ra0825-S02-sammendrag-enkeltelement-fra-grid1');
      assert(layouts['ra0825_S20_Summary']![5].id === 'ra0825-S02-sammendrag-enkeltelement-fra-grid1');
      assert(layouts['S20_Summary']![8].id === 'ra0825-S02-sammendrag-enkeltelement-fra-grid2');
      assert(layouts['ra0825_S20_Summary']![6].id === 'ra0825-S02-sammendrag-enkeltelement-fra-grid2');
      assert(layouts['S20_Summary']![9].id === 'ra0825-S02-sammendrag-enkeltelement-fra-grid3');
      assert(layouts['ra0825_S20_Summary']![7].id === 'ra0825-S02-sammendrag-enkeltelement-fra-grid3');
      assert(layouts['S20_Summary']![10].id === 'ra0825-S03-sammendrag-1a');
      assert(layouts['ra0825_S20_Summary']![9].id === 'ra0825-S03-sammendrag-1a');
      assert(layouts['S20_Summary']![11].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid1');
      assert(layouts['ra0825_S20_Summary']![10].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid1');
      assert(layouts['S20_Summary']![12].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid2');
      assert(layouts['ra0825_S20_Summary']![11].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid2');
      assert(layouts['S20_Summary']![13].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid3');
      assert(layouts['ra0825_S20_Summary']![12].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid3');
      assert(layouts['S20_Summary']![14].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid4');
      assert(layouts['ra0825_S20_Summary']![13].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid4');
      assert(layouts['S20_Summary']![15].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid5');
      assert(layouts['ra0825_S20_Summary']![14].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid5');
      assert(layouts['S20_Summary']![16].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid6');
      assert(layouts['ra0825_S20_Summary']![15].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid6');
      assert(layouts['S20_Summary']![17].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid7');
      assert(layouts['ra0825_S20_Summary']![16].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid7');
      assert(layouts['S20_Summary']![18].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid8');
      assert(layouts['ra0825_S20_Summary']![17].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid8');
      assert(layouts['S20_Summary']![19].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid9');
      assert(layouts['ra0825_S20_Summary']![18].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid9');
      assert(layouts['S20_Summary']![20].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid10');
      assert(layouts['ra0825_S20_Summary']![19].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid10');
      assert(layouts['S20_Summary']![21].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid11');
      assert(layouts['ra0825_S20_Summary']![20].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid11');
      assert(layouts['S20_Summary']![22].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid12');
      assert(layouts['ra0825_S20_Summary']![21].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid12');
      assert(layouts['S20_Summary']![23].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid13');
      assert(layouts['ra0825_S20_Summary']![22].id === 'ra0825-S03-sammendrag-enkeltelement-fra-grid13');
      assert(layouts['S20_Summary']![24].id === 'ra0825-S04-sammendrag');
      assert(layouts['ra0825_S20_Summary']![24].id === 'ra0825-S04-sammendrag');
      assert(layouts['S20_Summary']![26].id === 'ra0825-S05-sammendrag');
      assert(layouts['ra0825_S20_Summary']![26].id === 'ra0825-S05-sammendrag');
      assert(layouts['S20_Summary']![27].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid1');
      assert(layouts['ra0825_S20_Summary']![27].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid1');
      assert(layouts['S20_Summary']![28].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid2');
      assert(layouts['ra0825_S20_Summary']![28].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid2');
      assert(layouts['S20_Summary']![29].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid3');
      assert(layouts['ra0825_S20_Summary']![29].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid3');
      assert(layouts['S20_Summary']![30].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid4');
      assert(layouts['ra0825_S20_Summary']![30].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid4');
      assert(layouts['S20_Summary']![31].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid5');
      assert(layouts['ra0825_S20_Summary']![31].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid5');
      assert(layouts['S20_Summary']![32].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid6');
      assert(layouts['ra0825_S20_Summary']![32].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid6');
      assert(layouts['S20_Summary']![33].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid7');
      assert(layouts['ra0825_S20_Summary']![33].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid7');
      assert(layouts['S20_Summary']![34].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid8');
      assert(layouts['ra0825_S20_Summary']![34].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid8');
      assert(layouts['S20_Summary']![35].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid9');
      assert(layouts['ra0825_S20_Summary']![35].id === 'ra0825-S05-sammendrag-enkeltelement-fra-grid9');
      assert(layouts['S20_Summary']![36].id === 'ra0825-S06-sammendrag');
      assert(layouts['ra0825_S20_Summary']![37].id === 'ra0825-S06-sammendrag');
      assert(layouts['S90_KommentarOgKontakt']![7].id === 'ab9b59d8-962f-454b-9ab5-a8a6b8e2cbbc');
      assert(layouts['ra0825_S20_Summary']![38].id === 'ab9b59d8-962f-454b-9ab5-a8a6b8e2cbbc');

      layouts['ra0825_S20_Summary']![0].id = 'summary-sidetittelDuplicate';
      layouts['ra0825_S20_Summary']![1].id = 'summary-infotekstDuplicate';
      layouts['ra0825_S20_Summary']![2].id = 'ra0825-S01-sammendragDuplicate';
      layouts['ra0825_S20_Summary']![3].id = 'ra0825-S02-sammendragDuplicate';
      layouts['ra0825_S20_Summary']![4].id = 'ra0825-S02-sammendrag-enkeltelement-fra-gridDuplicate';
      layouts['ra0825_S20_Summary']![5].id = 'ra0825-S02-sammendrag-enkeltelement-fra-grid1Duplicate';
      layouts['ra0825_S20_Summary']![6].id = 'ra0825-S02-sammendrag-enkeltelement-fra-grid2Duplicate';
      layouts['ra0825_S20_Summary']![7].id = 'ra0825-S02-sammendrag-enkeltelement-fra-grid3Duplicate';
      layouts['ra0825_S20_Summary']![9].id = 'ra0825-S03-sammendrag-1aDuplicate';
      layouts['ra0825_S20_Summary']![10].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid1Duplicate';
      layouts['ra0825_S20_Summary']![11].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid2Duplicate';
      layouts['ra0825_S20_Summary']![12].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid3Duplicate';
      layouts['ra0825_S20_Summary']![13].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid4Duplicate';
      layouts['ra0825_S20_Summary']![14].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid5Duplicate';
      layouts['ra0825_S20_Summary']![15].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid6Duplicate';
      layouts['ra0825_S20_Summary']![16].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid7Duplicate';
      layouts['ra0825_S20_Summary']![17].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid8Duplicate';
      layouts['ra0825_S20_Summary']![18].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid9Duplicate';
      layouts['ra0825_S20_Summary']![19].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid10Duplicate';
      layouts['ra0825_S20_Summary']![20].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid11Duplicate';
      layouts['ra0825_S20_Summary']![21].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid12Duplicate';
      layouts['ra0825_S20_Summary']![22].id = 'ra0825-S03-sammendrag-enkeltelement-fra-grid13Duplicate';
      layouts['ra0825_S20_Summary']![24].id = 'ra0825-S04-sammendragDuplicate';
      layouts['ra0825_S20_Summary']![26].id = 'ra0825-S05-sammendragDuplicate';
      layouts['ra0825_S20_Summary']![27].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid1Duplicate';
      layouts['ra0825_S20_Summary']![28].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid2Duplicate';
      layouts['ra0825_S20_Summary']![29].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid3Duplicate';
      layouts['ra0825_S20_Summary']![30].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid4Duplicate';
      layouts['ra0825_S20_Summary']![31].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid5Duplicate';
      layouts['ra0825_S20_Summary']![32].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid6Duplicate';
      layouts['ra0825_S20_Summary']![33].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid7Duplicate';
      layouts['ra0825_S20_Summary']![34].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid8Duplicate';
      layouts['ra0825_S20_Summary']![35].id = 'ra0825-S05-sammendrag-enkeltelement-fra-grid9Duplicate';
      layouts['ra0825_S20_Summary']![37].id = 'ra0825-S06-sammendragDuplicate';
      layouts['ra0825_S20_Summary']![38].id = 'ab9b59d8-962f-454b-9ab5-a8a6b8e2cbbcDuplicate';
    },
    logMessages: [
      `Renamed component id 'summary-sidetittel' to 'summary-sidetittelDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'summary-infotekst' to 'summary-infotekstDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S01-sammendrag' to 'ra0825-S01-sammendragDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S02-sammendrag' to 'ra0825-S02-sammendragDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S02-sammendrag-enkeltelement-fra-grid' to 'ra0825-S02-sammendrag-enkeltelement-fra-gridDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S02-sammendrag-enkeltelement-fra-grid1' to 'ra0825-S02-sammendrag-enkeltelement-fra-grid1Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S02-sammendrag-enkeltelement-fra-grid2' to 'ra0825-S02-sammendrag-enkeltelement-fra-grid2Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S02-sammendrag-enkeltelement-fra-grid3' to 'ra0825-S02-sammendrag-enkeltelement-fra-grid3Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-1a' to 'ra0825-S03-sammendrag-1aDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid1' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid1Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid2' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid2Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid3' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid3Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid4' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid4Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid5' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid5Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid6' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid6Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid7' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid7Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid8' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid8Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid9' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid9Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid10' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid10Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid11' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid11Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid12' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid12Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S03-sammendrag-enkeltelement-fra-grid13' to 'ra0825-S03-sammendrag-enkeltelement-fra-grid13Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S04-sammendrag' to 'ra0825-S04-sammendragDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag' to 'ra0825-S05-sammendragDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid1' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid1Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid2' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid2Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid3' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid3Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid4' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid4Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid5' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid5Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid6' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid6Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid7' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid7Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid8' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid8Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S05-sammendrag-enkeltelement-fra-grid9' to 'ra0825-S05-sammendrag-enkeltelement-fra-grid9Duplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ra0825-S06-sammendrag' to 'ra0825-S06-sammendragDuplicate' on page 'ra0825_S20_Summary'`,
      `Renamed component id 'ab9b59d8-962f-454b-9ab5-a8a6b8e2cbbc' to 'ab9b59d8-962f-454b-9ab5-a8a6b8e2cbbcDuplicate' on page 'ra0825_S20_Summary'`,
    ],
  },
  'sfvt/dgm-ansvarlig/form-ansvarlig': {
    verifyAndApply: (layouts) => {
      assert(layouts['agency-contact']![3].id === 'NavigationButtons-NWIXih');
      assert(layouts['agency-picker']![4].id === 'NavigationButtons-NWIXih');
      assert(layouts['already-responsible']![5].id === 'already-responsible-info');
      assert(layouts['already-responsible']![6].id === 'already-responsible-info');
      assert(layouts['pdf']![3].id === 'summary-deceased-Group');
      assert(layouts['summary']![2].id === 'summary-deceased-Group');
      assert(layouts['pdf']![4].id === 'summary-Paragraph-deceased');
      assert(layouts['summary']![3].id === 'summary-Paragraph-deceased');
      assert(layouts['pdf']![5].id === 'summary-responsible-Group');
      assert(layouts['summary']![5].id === 'summary-responsible-Group');
      assert(layouts['pdf']![6].id === 'summary-responsible-responsibility');
      assert(layouts['summary']![6].id === 'summary-responsible-responsibility');
      assert(layouts['pdf']![7].id === 'summary-responsible-notified-others');
      assert(layouts['summary']![7].id === 'summary-responsible-notified-others');
      assert(layouts['pdf']![8].id === 'summary-deceased-municipality-unknown');
      assert(layouts['summary']![8].id === 'summary-deceased-municipality-unknown');
      assert(layouts['pdf']![9].id === 'summary-deceased-municipality');
      assert(layouts['summary']![9].id === 'summary-deceased-municipality');
      assert(layouts['pdf']![10].id === 'summary-funeralhome-group');
      assert(layouts['summary']![10].id === 'summary-funeralhome-group');
      assert(layouts['pdf']![11].id === 'summary-burial-should-use-agency');
      assert(layouts['summary']![11].id === 'summary-burial-should-use-agency');
      assert(layouts['pdf']![12].id === 'summary-burial-agency');
      assert(layouts['summary']![12].id === 'summary-burial-agency');
      assert(layouts['pdf']![13].id === 'summary-burial-agency-contact');
      assert(layouts['summary']![13].id === 'summary-burial-agency-contact');
      assert(layouts['pdf']![14].id === 'summary-burial-Group');
      assert(layouts['summary']![14].id === 'summary-burial-Group');
      assert(layouts['pdf']![15].id === 'summary-burial-type');
      assert(layouts['summary']![15].id === 'summary-burial-type');
      assert(layouts['pdf']![16].id === 'summary-burial-domestic-foreign');
      assert(layouts['summary']![16].id === 'summary-burial-domestic-foreign');
      assert(layouts['pdf']![17].id === 'summary-burial-should-handle-ashes');
      assert(layouts['summary']![17].id === 'summary-burial-should-handle-ashes');
      assert(layouts['pdf']![18].id === 'summary-burial-cremation-municipality');
      assert(layouts['summary']![18].id === 'summary-burial-cremation-municipality');
      assert(layouts['pdf']![19].id === 'summary-burial-municipality');
      assert(layouts['summary']![19].id === 'summary-burial-municipality');
      assert(layouts['pdf']![20].id === 'summary-ashes-permit');
      assert(layouts['summary']![20].id === 'summary-ashes-permit');
      assert(layouts['pdf']![21].id === 'summary-ashes-permit-file');
      assert(layouts['summary']![21].id === 'summary-ashes-permit-file');
      assert(layouts['pdf']![22].id === 'summary-Header-mottakere');
      assert(layouts['summary']![23].id === 'summary-Header-mottakere');
      assert(layouts['pdf']![23].id === 'summary-deceased-municipality-hidden');
      assert(layouts['summary']![24].id === 'summary-deceased-municipality-hidden');
      assert(layouts['pdf']![24].id === 'summary-Paragraph-mottakere');
      assert(layouts['summary']![25].id === 'summary-Paragraph-mottakere');

      layouts['agency-picker']![4].id = 'NavigationButtons-NWIXihDuplicate';
      layouts['already-responsible']![6].id = 'already-responsible-infoDuplicate';
      layouts['summary']![2].id = 'summary-deceased-GroupDuplicate';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (layouts['summary']![2] as any).children = (layouts['summary']![2] as any).children.map((c: string) =>
        c === 'summary-deceased-multiple' ? c : `${c}Duplicate`,
      );
      layouts['summary']![3].id = 'summary-Paragraph-deceasedDuplicate';
      layouts['summary']![5].id = 'summary-responsible-GroupDuplicate';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (layouts['summary']![5] as any).children = (layouts['summary']![5] as any).children.map(
        (c: string) => `${c}Duplicate`,
      );
      layouts['summary']![6].id = 'summary-responsible-responsibilityDuplicate';
      layouts['summary']![7].id = 'summary-responsible-notified-othersDuplicate';
      layouts['summary']![8].id = 'summary-deceased-municipality-unknownDuplicate';
      layouts['summary']![9].id = 'summary-deceased-municipalityDuplicate';
      layouts['summary']![10].id = 'summary-funeralhome-groupDuplicate';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (layouts['summary']![10] as any).children = (layouts['summary']![10] as any).children.map(
        (c: string) => `${c}Duplicate`,
      );
      layouts['summary']![11].id = 'summary-burial-should-use-agencyDuplicate';
      layouts['summary']![12].id = 'summary-burial-agencyDuplicate';
      layouts['summary']![13].id = 'summary-burial-agency-contactDuplicate';
      layouts['summary']![14].id = 'summary-burial-GroupDuplicate';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (layouts['summary']![14] as any).children = (layouts['summary']![14] as any).children.map(
        (c: string) => `${c}Duplicate`,
      );
      layouts['summary']![15].id = 'summary-burial-typeDuplicate';
      layouts['summary']![16].id = 'summary-burial-domestic-foreignDuplicate';
      layouts['summary']![17].id = 'summary-burial-should-handle-ashesDuplicate';
      layouts['summary']![18].id = 'summary-burial-cremation-municipalityDuplicate';
      layouts['summary']![19].id = 'summary-burial-municipalityDuplicate';
      layouts['summary']![20].id = 'summary-ashes-permitDuplicate';
      layouts['summary']![21].id = 'summary-ashes-permit-fileDuplicate';
      layouts['summary']![23].id = 'summary-Header-mottakereDuplicate';
      layouts['summary']![24].id = 'summary-deceased-municipality-hiddenDuplicate';
      layouts['summary']![25].id = 'summary-Paragraph-mottakereDuplicate';
    },
    logMessages: [
      `Renamed component id 'NavigationButtons-NWIXih' to 'NavigationButtons-NWIXihDuplicate' on page 'agency-picker'`,
      `Renamed component id 'already-responsible-info' to 'already-responsible-infoDuplicate' on page 'already-responsible'`,
      `Renamed component id 'summary-deceased-Group' to 'summary-deceased-GroupDuplicate' on page 'summary'`,
      `Renamed component id 'summary-Paragraph-deceased' to 'summary-Paragraph-deceasedDuplicate' on page 'summary'`,
      `Renamed component id 'summary-responsible-Group' to 'summary-responsible-GroupDuplicate' on page 'summary'`,
      `Renamed component id 'summary-responsible-responsibility' to 'summary-responsible-responsibilityDuplicate' on page 'summary'`,
      `Renamed component id 'summary-responsible-notified-others' to 'summary-responsible-notified-othersDuplicate' on page 'summary'`,
      `Renamed component id 'summary-deceased-municipality-unknown' to 'summary-deceased-municipality-unknownDuplicate' on page 'summary'`,
      `Renamed component id 'summary-deceased-municipality' to 'summary-deceased-municipalityDuplicate' on page 'summary'`,
      `Renamed component id 'summary-funeralhome-group' to 'summary-funeralhome-groupDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-should-use-agency' to 'summary-burial-should-use-agencyDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-agency' to 'summary-burial-agencyDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-agency-contact' to 'summary-burial-agency-contactDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-Group' to 'summary-burial-GroupDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-type' to 'summary-burial-typeDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-domestic-foreign' to 'summary-burial-domestic-foreignDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-should-handle-ashes' to 'summary-burial-should-handle-ashesDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-cremation-municipality' to 'summary-burial-cremation-municipalityDuplicate' on page 'summary'`,
      `Renamed component id 'summary-burial-municipality' to 'summary-burial-municipalityDuplicate' on page 'summary'`,
      `Renamed component id 'summary-ashes-permit' to 'summary-ashes-permitDuplicate' on page 'summary'`,
      `Renamed component id 'summary-ashes-permit-file' to 'summary-ashes-permit-fileDuplicate' on page 'summary'`,
      `Renamed component id 'summary-Header-mottakere' to 'summary-Header-mottakereDuplicate' on page 'summary'`,
      `Renamed component id 'summary-deceased-municipality-hidden' to 'summary-deceased-municipality-hiddenDuplicate' on page 'summary'`,
      `Renamed component id 'summary-Paragraph-mottakere' to 'summary-Paragraph-mottakereDuplicate' on page 'summary'`,
    ],
  },
};

function assert(condition: boolean): asserts condition is true {
  if (!condition) {
    throw new Error('Quirk verification failed');
  }
}

function assertCompType<T extends CompTypes>(comp: CompExternal, type: T): asserts comp is CompExternal<T> {
  assert(comp.type === type);
}

function assertSequenceOfIds(layouts: ILayouts, page: string, ids: string[], startIndex = 0): void {
  for (const [idx, id] of ids.entries()) {
    assert(layouts[page]![startIndex + idx].id === id);
  }
}

function removeChildThatDoesNotExist(
  layouts: ILayouts,
  referenced: string,
  referencedBy: string,
  compType: 'Group' | 'RepeatingGroup',
) {
  for (const page of Object.values(layouts)) {
    for (const comp of page || []) {
      if (comp.id === referencedBy) {
        assertCompType(comp, compType);
        assert(Array.isArray(comp.children) && comp.children.includes(referenced));
        comp.children = comp.children.filter((c) => c !== referenced);
      }
      if (comp.id === referenced) {
        throw new Error('We found the target component after all');
      }
    }
  }
}
