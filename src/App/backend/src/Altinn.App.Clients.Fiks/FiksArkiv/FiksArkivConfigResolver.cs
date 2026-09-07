using System.Globalization;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.Factories;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Internal.Texts;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmelding;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivConfigResolver : IFiksArkivConfigResolver
{
    private readonly FiksArkivSettings _fiksArkivSettings;
    private readonly IAppMetadata _appMetadata;
    private readonly ITranslationService _translationService;
    private readonly ILayoutEvaluatorStateInitializer _layoutStateInitializer;
    private readonly ILogger<FiksArkivConfigResolver> _logger;
    private readonly GeneralSettings _generalSettings;
    private readonly IAltinnPartyClient _altinnPartyClient;

    public FiksArkivConfigResolver(
        IOptions<FiksArkivSettings> fiksArkivSettings,
        IAppMetadata appMetadata,
        ITranslationService translationService,
        ILayoutEvaluatorStateInitializer layoutStateInitializer,
        IOptions<GeneralSettings> generalSettings,
        IAltinnPartyClient altinnPartyClient,
        ILogger<FiksArkivConfigResolver> logger
    )
    {
        _fiksArkivSettings = fiksArkivSettings.Value;
        _appMetadata = appMetadata;
        _translationService = translationService;
        _layoutStateInitializer = layoutStateInitializer;
        _generalSettings = generalSettings.Value;
        _altinnPartyClient = altinnPartyClient;
        _logger = logger;
    }

    /// <inheritdoc />
    public FiksArkivDataTypeSettings PrimaryDocumentSettings =>
        _fiksArkivSettings.Documents?.PrimaryDocument
        ?? throw new FiksArkivConfigurationException("FiksArkivSettings.Documents.PrimaryDocument must be configured");

    /// <inheritdoc />
    public IReadOnlyList<FiksArkivDataTypeSettings> AttachmentSettings =>
        _fiksArkivSettings.Documents?.Attachments ?? [];

    /// <inheritdoc />
    public async Task<string> GetApplicationTitle(CancellationToken cancellationToken = default)
    {
        var appMetadata = await _appMetadata.GetApplicationMetadata();

        return await _translationService.TranslateTextKey("appName", LanguageConst.Nb)
            ?? appMetadata.Title.GetValueOrDefault(LanguageConst.Nb)
            ?? appMetadata.AppIdentifier.App;
    }

    /// <inheritdoc />
    public async Task<FiksArkivDocumentMetadata?> GetArchiveDocumentMetadata(
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken = default
    )
    {
        if (_fiksArkivSettings.Metadata is null)
            return null;

        var layoutState = await _layoutStateInitializer.Init(
            dataAccessor,
            dataAccessor.TaskId,
            language: dataAccessor.Language
        );
        Instance instance = dataAccessor.Instance;

        var caseFileTitle = await GetBindableConfigValue(
            layoutState,
            instance,
            _fiksArkivSettings.Metadata.CaseFileTitle,
            x => ParseMetadataString(x, nameof(FiksArkivMetadataSettings.CaseFileTitle)),
            cancellationToken
        );
        var journalEntryTitle = await GetBindableConfigValue(
            layoutState,
            instance,
            _fiksArkivSettings.Metadata.JournalEntryTitle,
            x => ParseMetadataString(x, nameof(FiksArkivMetadataSettings.JournalEntryTitle)),
            cancellationToken
        );
        var systemId = await GetBindableConfigValue(
            layoutState,
            instance,
            _fiksArkivSettings.Metadata.SystemId,
            x => ParseMetadataString(x, nameof(FiksArkivMetadataSettings.SystemId)),
            cancellationToken
        );
        var ruleId = await GetBindableConfigValue(
            layoutState,
            instance,
            _fiksArkivSettings.Metadata.RuleId,
            x => ParseMetadataString(x, nameof(FiksArkivMetadataSettings.RuleId)),
            cancellationToken
        );
        var caseFileId = await GetBindableConfigValue(
            layoutState,
            instance,
            _fiksArkivSettings.Metadata.CaseFileId,
            x => ParseMetadataString(x, nameof(FiksArkivMetadataSettings.CaseFileId)),
            cancellationToken
        );
        var caseFileAdministrativeUnit = await GetBindableConfigValue(
            layoutState,
            instance,
            _fiksArkivSettings.Metadata.CaseFileAdministrativeUnit,
            x => ParseMetadataString(x, nameof(FiksArkivMetadataSettings.CaseFileAdministrativeUnit)),
            cancellationToken
        );

        return new FiksArkivDocumentMetadata(
            systemId,
            ruleId,
            caseFileId,
            caseFileTitle,
            journalEntryTitle,
            caseFileAdministrativeUnit
        );
    }

    /// <inheritdoc />
    public async Task<FiksArkivRecipient> GetRecipient(
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken = default
    )
    {
        var recipientSettings =
            _fiksArkivSettings.Recipient
            ?? throw new FiksArkivConfigurationException("FiksArkivSettings.Recipient must be configured.");
        var layoutState = await _layoutStateInitializer.Init(
            dataAccessor,
            dataAccessor.TaskId,
            language: dataAccessor.Language
        );
        Instance instance = dataAccessor.Instance;

        var accountId =
            await GetBindableConfigValue(
                layoutState,
                instance,
                recipientSettings.FiksAccount,
                ParseGuid,
                cancellationToken
            )
            ?? throw new FiksArkivException(
                "FiksArkivSettings.Recipient.FiksAccount is required, but did not resolve to a value."
            );
        var identifier =
            await GetBindableConfigValue(
                layoutState,
                instance,
                recipientSettings.Identifier,
                x => ParseRecipientString(x, nameof(FiksArkivRecipient.Identifier)),
                cancellationToken
            )
            ?? throw new FiksArkivException(
                "FiksArkivSettings.Recipient.Identifier is required, but did not resolve to a value."
            );
        var name =
            await GetBindableConfigValue(
                layoutState,
                instance,
                recipientSettings.Name,
                x => ParseRecipientString(x, nameof(FiksArkivRecipient.Name)),
                cancellationToken
            )
            ?? throw new FiksArkivException(
                "FiksArkivSettings.Recipient.Name is required, but did not resolve to a value."
            );
        var orgNumber = await GetBindableConfigValue(
            layoutState,
            instance,
            recipientSettings.OrganizationNumber,
            x => ParseRecipientString(x, nameof(FiksArkivRecipient.OrgNumber)),
            cancellationToken
        );

        return new FiksArkivRecipient(accountId, identifier, name, orgNumber);
    }

    private static Guid? ParseGuid(object? data) =>
        Guid.TryParse($"{data}", out var parsedGuid)
            ? parsedGuid
            : throw new FiksArkivException($"Could not parse recipient account from data binding: {data}");

    private static string? ParseMetadataString(object? data, string paramName) =>
        (data as string).EnsureNotEmpty($"{nameof(FiksArkivMetadataSettings)}.{paramName}");

    private static string? ParseRecipientString(object? data, string paramName) =>
        (data as string).EnsureNotEmpty($"{nameof(FiksArkivReceiptSettings)}.{paramName}");

    /// <inheritdoc />
    public string GetInstanceReference(Instance instance) => instance.GetInstanceUrl(_generalSettings);

    /// <inheritdoc />
    public Korrespondansepart GetRecipientParty(Instance instance, FiksArkivRecipient recipient) =>
        KorrespondansepartFactory.CreateRecipient(
            partyId: recipient.Identifier,
            partyName: recipient.Name,
            organizationId: recipient.OrgNumber,
            reference: GetInstanceReference(instance)
        );

    /// <inheritdoc />
    public async Task<IReadOnlyList<Klassifikasjon>> GetCaseFileClassifications(
        Instance instance,
        CancellationToken cancellationToken = default
    )
    {
        var entries = _fiksArkivSettings.Metadata?.CaseFileClassifications;
        if (entries is null || entries.Count == 0)
            return [];

        var result = new List<Klassifikasjon>(entries.Count);
        foreach (var entry in entries)
        {
            var classification = entry.Source switch
            {
                FiksArkivClassificationSource.InstanceOwner => await GetInstanceOwnerClassification(
                    instance,
                    cancellationToken
                ),
                null => entry.ToKlassifikasjon(),
                _ => throw new FiksArkivException($"Unsupported classification source: {entry.Source}"),
            };

            // Forward the IsRestricted value from config
            classification.ErSkjermet = entry.IsRestricted;

            result.Add(classification);
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<Korrespondansepart?> GetInstanceOwnerParty(
        Instance instance,
        CancellationToken cancellationToken = default
    )
    {
        Party? party = await GetInstanceOwnerRegisterParty(instance, cancellationToken);
        if (party is null)
            return null;

        var resolvedPartyId = party.PartyUuid?.ToString() ?? party.PartyId.ToString(CultureInfo.InvariantCulture);
        var correspondenceParty = KorrespondansepartFactory.CreateSender(
            partyId: resolvedPartyId,
            partyName: party.Name ?? resolvedPartyId
        );

        if (party.Organization is not null)
        {
            correspondenceParty.Organisasjonid = !string.IsNullOrWhiteSpace(party.Organization.OrgNumber)
                ? party.Organization.OrgNumber
                : null;

            correspondenceParty.AddContactInfo(
                phoneNumber: party.Organization.TelephoneNumber,
                mobileNumber: party.Organization.MobileNumber,
                address: party.Organization.MailingAddress,
                postcode: party.Organization.MailingPostalCode,
                city: party.Organization.MailingPostalCity
            );
        }
        else if (party.Person is not null)
        {
            correspondenceParty.Personid = !string.IsNullOrWhiteSpace(party.Person.SSN) ? party.Person.SSN : null;

            correspondenceParty.AddContactInfo(
                phoneNumber: party.Person.TelephoneNumber,
                mobileNumber: party.Person.MobileNumber,
                address: party.Person.MailingAddress,
                postcode: party.Person.MailingPostalCode,
                city: party.Person.MailingPostalCity
            );
        }

        return correspondenceParty;
    }

    /// <summary>
    /// Looks the instance owner up in the register. A failed lookup is logged and yields <c>null</c>, so the
    /// shipment degrades to the identifiers recorded on the instance rather than failing.
    /// </summary>
    private async Task<Party?> GetInstanceOwnerRegisterParty(Instance instance, CancellationToken cancellationToken)
    {
        try
        {
            cancellationToken.ThrowIfCancellationRequested();
            int partyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);
            return await _altinnPartyClient.GetParty(partyId); // Note: doesn't accept cancellation token.. yet
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Could not retrieve party information for {PartyId}: {Exception}",
                instance?.InstanceOwner?.PartyId,
                e
            );
        }

        return null;
    }

    /// <summary>
    /// The instance owner as recorded on the instance: an organization by its organization number, a person by
    /// their national identity number, titled with the registered name when the register knows the party. The
    /// shipment runs in the workflow engine with no end user present, and the case is about the owner regardless
    /// of who submitted it, so the owner is the only identity that is both available and correct here.
    /// </summary>
    private async Task<Klassifikasjon> GetInstanceOwnerClassification(
        Instance instance,
        CancellationToken cancellationToken
    )
    {
        InstanceOwner? owner = instance.InstanceOwner;
        string? name = (await GetInstanceOwnerRegisterParty(instance, cancellationToken))?.Name;

        if (!string.IsNullOrWhiteSpace(owner?.OrganisationNumber))
            return KlassifikasjonFactory.CreateOrganization(owner.OrganisationNumber, name);

        if (!string.IsNullOrWhiteSpace(owner?.PersonNumber))
            return KlassifikasjonFactory.CreatePerson(owner.PersonNumber, name);

        throw new FiksArkivException(
            $"The owner of instance {instance.Id} (party {owner?.PartyId}) has neither an organization number nor a "
                + $"national identity number, so the {nameof(FiksArkivClassificationSource.InstanceOwner)} case file "
                + "classification cannot be resolved."
        );
    }

    private static async Task<T?> GetBindableConfigValue<T>(
        LayoutEvaluatorState layoutState,
        Instance instance,
        FiksArkivBindableValue<T>? configValue,
        Func<object?, T?> parser,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();

        if (configValue is null)
            return default;

        if (configValue.Value is not null)
            return configValue.Value;

        var binding =
            configValue.DataModelBinding
            ?? throw new FiksArkivException($"Neither value nor data binding was supplied for config: {configValue}");
        var dataElement = instance.GetRequiredDataElement(binding.DataType);
        var data = await layoutState.GetModelData(binding, dataElement, null); // Note: Doesn't accept cancellation token.. yet

        return parser.Invoke(data);
    }
}
