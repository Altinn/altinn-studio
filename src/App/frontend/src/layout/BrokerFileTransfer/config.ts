import { CompCategory } from '@app/layout-contract';

import { CG } from 'src/codegen/CG';
import { ExprVal } from 'src/features/expressions/types';

export const Config = new CG.component({
  category: CompCategory.Form,
  availability: 'configurable',
  metadata: {
    name: { nb: 'Formidling', en: 'Broker file transfer' },
    description: {
      en: 'Sends a file to other organizations with Altinn Broker, straight from the form.',
      nb: 'Sender en fil til andre virksomheter med Altinn Formidling, rett fra skjemaet.',
    },
    lifecycle: { status: 'beta' },
  },
  capabilities: {
    renderInTable: false,
    renderInButtonGroup: false,
    renderInAccordion: true,
    renderInAccordionGroup: false,
    renderInCards: true,
    renderInCardsMedia: false,
    renderInTabs: true,
  },
})
  .makeSummarizable()
  .addProperty(CG.common('renderAsSummary'))
  .addProperty(CG.common('forceShowInSummary'))
  .extendTextResources(CG.common('TRBSummarizable'))
  .addProperty(CG.common('required'))
  .addProperty(CG.common('readOnly'))
  .addSummaryOverrides()
  .addDataModelBinding(
    new CG.obj(
      new CG.prop(
        'fileTransferId',
        new CG.dataModelBinding()
          .setTitle('Data model binding for the file transfer ID', 'Datamodellbinding for formidlings-ID')
          .setDescription(
            'Where in the data model the component stores the ID Altinn Broker gave the file transfer, as soon as the transfer is created.',
            'Angir hvor i datamodellen komponenten lagrer ID-en Altinn Formidling ga formidlingen, så snart formidlingen er opprettet.',
          ),
      ),
      new CG.prop(
        'fileTransferStatus',
        new CG.dataModelBinding()
          .setTitle('Data model binding for the file transfer status', 'Datamodellbinding for formidlingsstatus')
          .setDescription(
            "Where in the data model the component stores the file transfer's status in Altinn Broker: Initialized when the transfer is created, and UploadProcessing or a later status once Broker has the whole file. The form cannot be submitted before then.",
            'Angir hvor i datamodellen komponenten lagrer statusen til formidlingen i Altinn Formidling: Initialized når formidlingen er opprettet, og UploadProcessing eller en senere status når Formidling har mottatt hele filen. Skjemaet kan ikke sendes inn før det.',
          ),
      ),
      new CG.prop(
        'fileName',
        new CG.dataModelBinding()
          .setTitle('Data model binding for the file name', 'Datamodellbinding for filnavn')
          .setDescription(
            'Where in the data model the component stores the name of the file it sends.',
            'Angir hvor i datamodellen komponenten lagrer navnet på filen den sender.',
          )
          .optional(),
      ),
    ),
  )
  .addProperty(
    new CG.prop(
      'resourceId',
      new CG.str()
        .setTitle('Resource ID', 'Ressurs-ID')
        .setDescription(
          'The Altinn Broker service the file is sent on: the ID of its resource in the Altinn Resource Registry.',
          'Formidlingstjenesten filen sendes på: ID-en til ressursen i Altinn ressursregister.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'hasCustomRecipients',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Specify recipients', 'Spesifiser mottakere')
        .setDescription(
          'Whether the file is sent to the organizations in recipients. When false, it is sent to the party the Broker resource requires (requiredParty).',
          'Angir om filen sendes til virksomhetene i recipients. Ellers sendes den til parten ressursen i Altinn Formidling krever (requiredParty).',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'recipients',
      new CG.expr(ExprVal.String)
        .optional({ default: '' })
        .setTitle('Recipients', 'Mottakere')
        .setDescription(
          'Comma-separated organization numbers of the organizations that receive the file. Only used when hasCustomRecipients is set.',
          'Kommaseparerte organisasjonsnumre til virksomhetene som mottar filen. Brukes bare når hasCustomRecipients er satt.',
        )
        .addExample('991825827, 912345678'),
    ),
  )
  .addProperty(
    new CG.prop(
      'metadata',
      new CG.obj()
        .optional()
        .additionalProperties(new CG.expr(ExprVal.String).setFallback(''))
        .setTitle('Metadata', 'Metadata')
        .setDescription(
          'Metadata sent with the file transfer, as Altinn Broker\'s property list: at most 10 entries, each key at most 50 characters. A value is fixed text or an expression, such as ["dataModel", "path.to.field"] for something the user filled in. Entries without a value when the file is sent are left out.',
          'Metadata som sendes med formidlingen, som egenskapslisten i Altinn Formidling: høyst 10 oppføringer, og hver nøkkel høyst 50 tegn. En verdi er fast tekst eller et uttrykk, for eksempel ["dataModel", "sti.til.felt"] for noe brukeren har fylt ut. Oppføringer uten verdi når filen sendes, utelates.',
        )
        .addExample({ caseNumber: ['dataModel', 'case.number'], category: 'invoice' }),
    ),
  )
  .addProperty(
    new CG.prop(
      'disableVirusScan',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Disable virus scan', 'Slå av virusskanning')
        .setDescription(
          'Sends the file without scanning it for viruses, so the size limit that scanning sets does not apply. Only allowed when the Broker resource is approved for it; otherwise the component shows a configuration error.',
          'Sender filen uten å skanne den for virus, slik at grensen for filstørrelse som skanningen setter, ikke gjelder. Bare tillatt når ressursen i Altinn Formidling er godkjent for det. Ellers viser komponenten en konfigurasjonsfeil.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'maxFileTransferSizeInMB',
      new CG.int()
        .optional()
        .setMin(1)
        .setTitle('Max file size (MB)', 'Maksimal filstørrelse (MB)')
        .setDescription(
          "Limits the file size further than the Broker resource does; the resource's limit still applies if it is lower. A file transfer with virus scan enabled does not support files larger than 50 GB.",
          'Begrenser filstørrelsen mer enn ressursen i Altinn Formidling gjør. Grensen på ressursen gjelder fortsatt hvis den er lavere. En formidling med virusskanning støtter ikke filer større enn 50 GB.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'hasCustomFileEndings',
      new CG.bool()
        .optional({ default: false })
        .setTitle('Has custom file endings', 'Har egendefinerte filendelser')
        .setDescription(
          'Boolean value indicating if the component has valid file endings',
          'Angir om komponenten har gyldige filendelser.',
        ),
    ),
  )
  .addProperty(
    new CG.prop(
      'validFileEndings',
      new CG.union(new CG.str(), new CG.arr(new CG.str()))
        .optional()
        .setTitle('Valid file endings', 'Tillatte filendelser')
        .setDescription(
          'A separated string of valid file endings to upload. If not set all endings are accepted.',
          'En kommaseparert liste over tillatte filendelser. Alle filendelser godtas hvis egenskapen ikke er satt.',
        )
        .addExample('.csv', '.doc', '.docx', '.gif', '.jpeg', '.pdf', '.txt'),
    ),
  )
  .extends(CG.common('LabeledComponentProps'))
  .extendTextResources(CG.common('TRBLabel'));
