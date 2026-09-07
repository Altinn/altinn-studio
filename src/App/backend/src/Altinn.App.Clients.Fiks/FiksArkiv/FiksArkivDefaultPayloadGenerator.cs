using System.Text;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;
using KS.Fiks.Arkiv.Models.V1.Kodelister;
using KS.Fiks.Arkiv.Models.V1.Metadatakatalog;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Kode = KS.Fiks.Arkiv.Models.V1.Kodelister.Kode;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivDefaultPayloadGenerator : IFiksArkivPayloadGenerator
{
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly ILogger<FiksArkivDefaultPayloadGenerator> _logger;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly IFiksArkivConfigResolver _fiksArkivConfigResolver;
    private readonly TimeProvider _timeProvider;

    private bool _indentXmlSerialization => !_hostEnvironment.IsProduction();

    public FiksArkivDefaultPayloadGenerator(
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IAuthenticationContext authenticationContext,
        ILogger<FiksArkivDefaultPayloadGenerator> logger,
        IHostEnvironment hostEnvironment,
        IFiksArkivConfigResolver fiksArkivConfigResolver,
        TimeProvider? timeProvider = null
    )
    {
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _authenticationContext = authenticationContext;
        _logger = logger;
        _hostEnvironment = hostEnvironment;
        _fiksArkivConfigResolver = fiksArkivConfigResolver;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<FiksIOMessagePayload>> GeneratePayload(
        string taskId,
        Instance instance,
        FiksArkivRecipient recipient,
        string messageType,
        CancellationToken cancellationToken = default
    )
    {
        if (messageType != FiksArkivConstants.MessageTypes.CreateArchiveRecord)
            throw new FiksArkivException(
                $"Unsupported message type: {messageType}. {nameof(FiksArkivDefaultPayloadGenerator)} can only handle {FiksArkivConstants.MessageTypes.CreateArchiveRecord} requests."
            );

        var now = _timeProvider.GetUtcNow();
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var documentCreator = appMetadata.AppIdentifier.Org;
        var archiveDocuments = await GetArchiveDocuments(instance, cancellationToken);
        var defaultDocumentTitle = await _fiksArkivConfigResolver.GetApplicationTitle(cancellationToken);
        var documentMetadata = await _fiksArkivConfigResolver.GetArchiveDocumentMetadata(instance, cancellationToken);
        var recipientParty = _fiksArkivConfigResolver.GetRecipientParty(instance, recipient);
        var instanceOwnerParty = await _fiksArkivConfigResolver.GetInstanceOwnerParty(instance, cancellationToken);
        var caseFileClassifications = await _fiksArkivConfigResolver.GetCaseFileClassifications(
            _authenticationContext.Current,
            cancellationToken
        );

        var caseFile = new Saksmappe
        {
            Tittel = documentMetadata?.CaseFileTitle ?? defaultDocumentTitle,
            OffentligTittel = documentMetadata?.CaseFileTitle ?? defaultDocumentTitle,
            AdministrativEnhet = new AdministrativEnhet
            {
                Navn = documentMetadata?.CaseFileAdministrativeUnit ?? documentCreator,
            },
            Saksaar = now.Year,
            Saksdato = now.UtcDateTime,
            ReferanseEksternNoekkel = new EksternNoekkel
            {
                Fagsystem = appMetadata.AppIdentifier.ToString(),
                Noekkel = documentMetadata?.CaseFileId ?? instance.Id,
            },
        };

        foreach (var classification in caseFileClassifications)
        {
            caseFile.Klassifikasjon.Add(classification);
        }

        var journalEntry = new Journalpost
        {
            Journalaar = now.Year,
            DokumentetsDato = now.UtcDateTime,
            SendtDato = now.UtcDateTime,
            Tittel = documentMetadata?.JournalEntryTitle ?? defaultDocumentTitle,
            OffentligTittel = documentMetadata?.JournalEntryTitle ?? defaultDocumentTitle,
            OpprettetAv = documentCreator,
            ArkivertAv = documentCreator,
            Journalstatus = new Journalstatus
            {
                KodeProperty = JournalstatusKoder.Journalfoert.Verdi,
                Beskrivelse = JournalstatusKoder.Journalfoert.Beskrivelse,
            },
            Journalposttype = new Journalposttype
            {
                KodeProperty = JournalposttypeKoder.InngaaendeDokument.Verdi,
                Beskrivelse = JournalposttypeKoder.InngaaendeDokument.Beskrivelse,
            },
            ReferanseForelderMappe = new ReferanseTilMappe
            {
                ReferanseEksternNoekkel = caseFile.ReferanseEksternNoekkel,
            },
            ReferanseEksternNoekkel = caseFile.ReferanseEksternNoekkel,
        };

        // Recipient
        journalEntry.Korrespondansepart.Add(recipientParty);

        // Sender
        if (instanceOwnerParty is not null)
        {
            journalEntry.Korrespondansepart.Add(instanceOwnerParty);
        }

        // Main form data file
        journalEntry.Dokumentbeskrivelse.Add(GetDocumentDescription(archiveDocuments.PrimaryDocument, now));

        // Attachments
        foreach (var attachment in archiveDocuments.AttachmentDocuments)
        {
            journalEntry.Dokumentbeskrivelse.Add(GetDocumentDescription(attachment, now));
        }

        // Archive record
        var archiveRecord = new Arkivmelding
        {
            Mappe = caseFile,
            Registrering = journalEntry,
            AntallFiler = journalEntry.Dokumentbeskrivelse.Count,
            System = documentMetadata?.SystemId ?? FiksArkivConstants.AltinnSystemId,
            Regel = documentMetadata?.RuleId,
        };

        if (!_hostEnvironment.IsProduction())
        {
            string xmlResult = Encoding.UTF8.GetString(archiveRecord.SerializeXml(_indentXmlSerialization).Span);
            _logger.LogInformation(xmlResult);
        }

        return [archiveRecord.ToPayload(_indentXmlSerialization), .. archiveDocuments.ToPayloads()];
    }

    private async Task<FiksArkivDocuments> GetArchiveDocuments(
        Instance instance,
        CancellationToken cancellationToken = default
    )
    {
        InstanceIdentifier instanceId = new(instance.Id);
        var primaryDocumentSettings = _fiksArkivConfigResolver.PrimaryDocumentSettings;
        var primaryDataElement = instance.GetRequiredDataElement(primaryDocumentSettings.DataType);
        var primaryDocument = await GetPayload(
            primaryDataElement,
            primaryDocumentSettings.Filename,
            DokumenttypeKoder.Dokument,
            primaryDocumentSettings.Format,
            primaryDocumentSettings.Variant,
            instanceId,
            cancellationToken
        );

        List<MessagePayloadWrapper> attachmentDocuments = [];
        foreach (var attachmentSetting in _fiksArkivConfigResolver.AttachmentSettings)
        {
            IReadOnlyList<DataElement> dataElements = instance
                .GetOptionalDataElements(attachmentSetting.DataType)
                .ToList();

            if (dataElements.Any() is false)
                continue;

            attachmentDocuments.AddRange(
                await Task.WhenAll(
                    dataElements.Select(async x =>
                        await GetPayload(
                            x,
                            attachmentSetting.Filename,
                            DokumenttypeKoder.Vedlegg,
                            attachmentSetting.Format,
                            attachmentSetting.Variant,
                            instanceId,
                            cancellationToken
                        )
                    )
                )
            );
        }

        return new FiksArkivDocuments(primaryDocument, attachmentDocuments);
    }

    private async Task<MessagePayloadWrapper> GetPayload(
        DataElement dataElement,
        string? filename,
        Kode fileTypeCode,
        FiksArkivCode? fileFormat,
        FiksArkivCode? fileVariant,
        InstanceIdentifier instanceId,
        CancellationToken cancellationToken = default
    )
    {
        if (string.IsNullOrWhiteSpace(filename) is false)
            dataElement.Filename = filename;
        else if (string.IsNullOrWhiteSpace(dataElement.Filename))
            dataElement.Filename = $"{dataElement.DataType}{dataElement.GetExtensionForContentType()}";

        return new MessagePayloadWrapper(
            new FiksIOMessagePayload(
                dataElement.Filename,
                await _dataClient.GetDataBytes(
                    instanceId.InstanceOwnerPartyId,
                    instanceId.InstanceGuid,
                    Guid.Parse(dataElement.Id),
                    cancellationToken: cancellationToken
                )
            ),
            fileTypeCode,
            fileFormat,
            fileVariant
        );
    }

    private static Dokumentbeskrivelse GetDocumentDescription(MessagePayloadWrapper payloadWrapper, DateTimeOffset now)
    {
        var documentClassification =
            payloadWrapper.FileTypeCode == DokumenttypeKoder.Dokument
                ? TilknyttetRegistreringSomKoder.Hoveddokument
                : TilknyttetRegistreringSomKoder.Vedlegg;

        var metadata = new Dokumentbeskrivelse
        {
            Dokumenttype = new Dokumenttype
            {
                KodeProperty = payloadWrapper.FileTypeCode.Verdi,
                Beskrivelse = payloadWrapper.FileTypeCode.Beskrivelse,
            },
            Dokumentstatus = new Dokumentstatus
            {
                KodeProperty = DokumentstatusKoder.Ferdig.Verdi,
                Beskrivelse = DokumentstatusKoder.Ferdig.Beskrivelse,
            },
            Tittel = payloadWrapper.Payload.Filename,
            TilknyttetRegistreringSom = new TilknyttetRegistreringSom
            {
                KodeProperty = documentClassification.Verdi,
                Beskrivelse = documentClassification.Beskrivelse,
            },
            OpprettetDato = now.UtcDateTime,
        };

        metadata.Dokumentobjekt.Add(
            new Dokumentobjekt
            {
                Filnavn = payloadWrapper.Payload.Filename,
                ReferanseDokumentfil = payloadWrapper.Payload.Filename,
                Format = payloadWrapper.GetFileFormat(),
                Variantformat = payloadWrapper.GetFileVariant(),
            }
        );

        return metadata;
    }
}
