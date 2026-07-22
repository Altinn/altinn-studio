using System.Text;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;
using KS.Fiks.Arkiv.Models.V1.Kodelister;
using KS.Fiks.Arkiv.Models.V1.Metadatakatalog;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Kode = KS.Fiks.Arkiv.Models.V1.Kodelister.Kode;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivDefaultPayloadGenerator : IFiksArkivPayloadGenerator
{
    private readonly IAppMetadata _appMetadata;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly ILogger<FiksArkivDefaultPayloadGenerator> _logger;
    private readonly IHostEnvironment _hostEnvironment;
    private readonly IFiksArkivConfigResolver _fiksArkivConfigResolver;
    private readonly FiksIOSettings _fiksIOSettings;
    private readonly FiksArkivSettings _fiksArkivSettings;
    private readonly IAppModel _appModelResolver;
    private readonly TimeProvider _timeProvider;

    private bool _indentXmlSerialization => !_hostEnvironment.IsProduction();

    public FiksArkivDefaultPayloadGenerator(
        IAppMetadata appMetadata,
        IAuthenticationContext authenticationContext,
        ILogger<FiksArkivDefaultPayloadGenerator> logger,
        IHostEnvironment hostEnvironment,
        IFiksArkivConfigResolver fiksArkivConfigResolver,
        IAppModel appModelResolver,
        IOptions<FiksArkivSettings> fiksArkivSettings,
        IOptions<FiksIOSettings> fiksIOSettings,
        TimeProvider? timeProvider = null
    )
    {
        _appMetadata = appMetadata;
        _authenticationContext = authenticationContext;
        _logger = logger;
        _hostEnvironment = hostEnvironment;
        _fiksArkivConfigResolver = fiksArkivConfigResolver;
        _appModelResolver = appModelResolver;
        _fiksArkivSettings = fiksArkivSettings.Value;
        _fiksIOSettings = fiksIOSettings.Value;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    /// <inheritdoc />
    public async Task<IEnumerable<FiksIOMessagePayload>> GeneratePayload(
        string taskId,
        FiksArkivRecipient recipient,
        string messageType,
        DateTimeOffset executionReferenceTime,
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken = default
    )
    {
        DateTime localReferenceTime = TimeZoneInfo
            .ConvertTime(executionReferenceTime, _timeProvider.LocalTimeZone)
            .DateTime;
        return await GeneratePayloadUsingLocalTime(
            recipient,
            messageType,
            localReferenceTime,
            dataAccessor,
            cancellationToken
        );
    }

    private async Task<IEnumerable<FiksIOMessagePayload>> GeneratePayloadUsingLocalTime(
        FiksArkivRecipient recipient,
        string messageType,
        DateTime localReferenceTime,
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken
    )
    {
        if (messageType != FiksArkivConstants.MessageTypes.CreateArchiveRecord)
            throw new FiksArkivException(
                $"Unsupported message type: {messageType}. {nameof(FiksArkivDefaultPayloadGenerator)} can only handle {FiksArkivConstants.MessageTypes.CreateArchiveRecord} requests."
            );

        var instance = dataAccessor.Instance;
        var appMetadata = await _appMetadata.GetApplicationMetadata();
        var documentCreator = appMetadata.AppIdentifier.Org;
        var archiveDocuments = await GetArchiveDocuments(dataAccessor, cancellationToken);
        var defaultDocumentTitle = await _fiksArkivConfigResolver.GetApplicationTitle(cancellationToken);
        var documentMetadata = await _fiksArkivConfigResolver.GetArchiveDocumentMetadata(
            dataAccessor,
            cancellationToken
        );
        var recipientParty = _fiksArkivConfigResolver.GetRecipientParty(instance, recipient);
        var instanceOwnerParty = await _fiksArkivConfigResolver.GetInstanceOwnerParty(instance, cancellationToken);
        var instanceOwnerClassification = await _fiksArkivConfigResolver.GetInstanceOwnerClassification(
            _authenticationContext.Current,
            cancellationToken
        );

        var caseFile = new Saksmappe
        {
            Tittel = documentMetadata?.CaseFileTitle ?? defaultDocumentTitle,
            OffentligTittel = documentMetadata?.CaseFileTitle ?? defaultDocumentTitle,
            AdministrativEnhet = new AdministrativEnhet { Navn = documentCreator },
            Saksaar = localReferenceTime.Year,
            Saksdato = localReferenceTime,
            ReferanseEksternNoekkel = new EksternNoekkel
            {
                Fagsystem = appMetadata.AppIdentifier.ToString(),
                Noekkel = documentMetadata?.CaseFileId ?? instance.Id,
            },
        };

        caseFile.Klassifikasjon.Add(instanceOwnerClassification);

        var journalEntry = new Journalpost
        {
            Journalaar = localReferenceTime.Year,
            DokumentetsDato = localReferenceTime,
            SendtDato = localReferenceTime,
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
        journalEntry.Dokumentbeskrivelse.Add(
            GetDocumentDescription(archiveDocuments.PrimaryDocument, localReferenceTime)
        );

        // Attachments
        foreach (var attachment in archiveDocuments.AttachmentDocuments)
        {
            journalEntry.Dokumentbeskrivelse.Add(GetDocumentDescription(attachment, localReferenceTime));
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
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        var instance = dataAccessor.Instance;
        var primaryDocumentSettings = _fiksArkivConfigResolver.PrimaryDocumentSettings;
        var primaryDataElement = instance.GetRequiredDataElement(primaryDocumentSettings.DataType);
        var primaryDocument = await GetPayload(
            primaryDataElement,
            primaryDocumentSettings.Filename,
            DokumenttypeKoder.Dokument,
            dataAccessor
        );

        List<MessagePayloadWrapper> attachmentDocuments = [];
        foreach (var attachmentSetting in _fiksArkivConfigResolver.AttachmentSettings)
        {
            IReadOnlyList<DataElement> dataElements = [.. instance.GetOptionalDataElements(attachmentSetting.DataType)];

            if (dataElements.Any() is false)
                continue;

            attachmentDocuments.AddRange(
                await Task.WhenAll(
                    dataElements.Select(async x =>
                        await GetPayload(x, attachmentSetting.Filename, DokumenttypeKoder.Vedlegg, dataAccessor)
                    )
                )
            );
        }

        return new FiksArkivDocuments(primaryDocument, attachmentDocuments);
    }

    private static async Task<MessagePayloadWrapper> GetPayload(
        DataElement dataElement,
        string? filename,
        Kode fileTypeCode,
        IInstanceDataAccessor dataAccessor
    )
    {
        string payloadFilename = string.IsNullOrWhiteSpace(filename)
            ? string.IsNullOrWhiteSpace(dataElement.Filename)
                ? $"{dataElement.DataType}{dataElement.GetExtensionForContentType()}"
                : dataElement.Filename
            : filename;

        return new MessagePayloadWrapper(
            new FiksIOMessagePayload(payloadFilename, await dataAccessor.GetBinaryData(dataElement)),
            fileTypeCode
        );
    }

    private Dokumentbeskrivelse GetDocumentDescription(
        MessagePayloadWrapper payloadWrapper,
        DateTime localReferenceTime
    )
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
            OpprettetDato = localReferenceTime,
        };

        metadata.Dokumentobjekt.Add(
            new Dokumentobjekt
            {
                SystemID = new SystemID
                {
                    Value = _fiksIOSettings.AccountId.ToString(),
                    Label = FiksArkivConstants.AltinnSystemId,
                },
                Filnavn = payloadWrapper.Payload.Filename,
                ReferanseDokumentfil = payloadWrapper.Payload.Filename,
                Format = new Format { KodeProperty = payloadWrapper.Payload.GetDotlessFileExtension() },
                Variantformat = new Variantformat
                {
                    KodeProperty = VariantformatKoder.Produksjonsformat.Verdi,
                    Beskrivelse = VariantformatKoder.Produksjonsformat.Beskrivelse,
                },
            }
        );

        return metadata;
    }

    /// <inheritdoc />
    public Task ValidateConfiguration(
        IReadOnlyList<DataType> configuredDataTypes,
        IReadOnlyList<ProcessTask> configuredProcessTasks
    )
    {
        if (_fiksArkivSettings.Recipient is null)
            throw new FiksArkivConfigurationException(
                $"{nameof(FiksArkivSettings.Recipient)} configuration is required, but missing."
            );
        _fiksArkivSettings.Recipient.Validate(configuredDataTypes, _appModelResolver);

        if (_fiksArkivSettings.Documents is null)
            throw new FiksArkivConfigurationException(
                $"{nameof(FiksArkivSettings.Documents)} configuration is required, but missing."
            );
        _fiksArkivSettings.Documents.Validate(configuredDataTypes);

        _fiksArkivSettings.Metadata?.Validate(configuredDataTypes, _appModelResolver);

        return Task.CompletedTask;
    }
}
