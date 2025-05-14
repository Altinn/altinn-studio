using System.Diagnostics;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using Signee = Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigneeContextsManager : ISigneeContextsManager
{
    private readonly IAltinnPartyClient _altinnPartyClient;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly ILogger<SigneeContextsManager> _logger;
    private readonly Telemetry? _telemetry;

    public SigneeContextsManager(
        IAltinnPartyClient altinnPartyClient,
        AppImplementationFactory appImplementationFactory,
        ILogger<SigneeContextsManager> logger,
        Telemetry? telemetry = null
    )
    {
        _altinnPartyClient = altinnPartyClient;
        _appImplementationFactory = appImplementationFactory;
        _logger = logger;
        _telemetry = telemetry;
    }

    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(
        new JsonSerializerOptions
        {
            Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) },
            PropertyNameCaseInsensitive = true,
            WriteIndented = true,
            ReferenceHandler = ReferenceHandler.Preserve,
            MaxDepth = 16,
        }
    );

    // <inheritdoc />
    public async Task<List<SigneeContext>> GenerateSigneeContexts(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    )
    {
        using Activity? activity = _telemetry?.StartGenerateSigneeContextsActivity();

        string taskId = instanceDataMutator.Instance.Process.CurrentTask.ElementId;

        SigneeProviderResult? signeesResult = await GetSigneesFromProvider(
            instanceDataMutator,
            signatureConfiguration,
            ct
        );

        if (signeesResult is null)
        {
            return [];
        }

        List<SigneeContext> signeeContexts = [];
        foreach (ProvidedSignee signeeParty in signeesResult.Signees)
        {
            SigneeContext signeeContext = await GenerateSigneeContext(taskId, signeeParty, ct);
            signeeContexts.Add(signeeContext);
        }

        _logger.LogInformation(
            "Assigning {SigneeContextsCount} signees to task {TaskId}.",
            signeeContexts.Count,
            taskId
        );
        _logger.LogDebug(
            "Signee context state: {SigneeContexts}",
            JsonSerializer.Serialize(signeeContexts, _jsonSerializerOptions)
        );

        return signeeContexts;
    }

    // <inheritdoc />
    public async Task<List<SigneeContext>> GetSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    )
    {
        using Activity? activity = _telemetry?.StartReadSigneesContextsActivity();
        // If no SigneeStatesDataTypeId is set, delegated signing is not enabled and there is nothing to download.
        List<SigneeContext> signeeContexts = !string.IsNullOrEmpty(signatureConfiguration.SigneeStatesDataTypeId)
            ? await DownloadSigneeContexts(instanceDataAccessor, signatureConfiguration)
            : [];

        return signeeContexts;
    }

    /// <summary>
    /// Get signees from the signee provider implemented in the App.
    /// </summary>
    private async Task<SigneeProviderResult?> GetSigneesFromProvider(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    )
    {
        string? signeeProviderId = signatureConfiguration.SigneeProviderId;
        if (string.IsNullOrEmpty(signeeProviderId))
            return null;

        List<ISigneeProvider> matchingSigneeProviders = _appImplementationFactory
            .GetAll<ISigneeProvider>()
            .Where(x => x.Id == signeeProviderId)
            .ToList();

        if (matchingSigneeProviders.Count == 0)
        {
            throw new SigneeProviderNotFoundException(
                $"No signee provider found with ID {signeeProviderId}. Please add an implementation of the {nameof(ISigneeProvider)} interface with that ID or correct the ID if it's misspelled."
            );
        }

        if (matchingSigneeProviders.Count > 1)
        {
            throw new SigneeProviderNotFoundException(
                $"Found more than one signee provider with ID {signeeProviderId}. Please ensure that exactly one signee provider uses that ID."
            );
        }

        ISigneeProvider signeeProvider = matchingSigneeProviders.Single();
        SigneeProviderResult signeesResult = await signeeProvider.GetSignees(
            new GetSigneesParameters { InstanceDataAccessor = instanceDataAccessor }
        );

        return signeesResult;
    }

    private async Task<SigneeContext> GenerateSigneeContext(
        string taskId,
        ProvidedSignee providedSignee,
        CancellationToken ct
    )
    {
        Signee signee = await From(providedSignee, _altinnPartyClient.LookupParty);
        Party party = signee.GetParty();

        Notification? notification = providedSignee.CommunicationConfig?.Notification;

        Email? emailNotification = notification?.Email;
        if (emailNotification is not null && string.IsNullOrEmpty(emailNotification.EmailAddress))
        {
            emailNotification.EmailAddress = party.Organization?.EMailAddress;
        }

        Sms? smsNotification = notification?.Sms;
        if (smsNotification is not null && string.IsNullOrEmpty(smsNotification.MobileNumber))
        {
            smsNotification.MobileNumber = party.Organization?.MobileNumber ?? party.Person?.MobileNumber;
        }

        return new SigneeContext
        {
            TaskId = taskId,
            SigneeState = new SigneeContextState(),
            CommunicationConfig = providedSignee.CommunicationConfig,
            Signee = signee,
        };
    }

    private async Task<List<SigneeContext>> DownloadSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration
    )
    {
        string signeeStatesDataTypeId =
            signatureConfiguration.SigneeStatesDataTypeId
            ?? throw new ApplicationConfigException(
                "SigneeStatesDataTypeId is not set in the signature configuration."
            );

        IEnumerable<DataElement> dataElements = instanceDataAccessor.GetDataElementsForType(signeeStatesDataTypeId);

        DataElement? signeeStateDataElement = dataElements.SingleOrDefault();

        if (signeeStateDataElement is null)
        {
            _logger.LogInformation("Didn't find any signee states for task.");
            return [];
        }

        ReadOnlyMemory<byte> data = await instanceDataAccessor.GetBinaryData(signeeStateDataElement);
        string signeeStateSerialized = Encoding.UTF8.GetString(data.ToArray());

        List<SigneeContext> signeeContexts =
            JsonSerializer.Deserialize<List<SigneeContext>>(signeeStateSerialized, _jsonSerializerOptions) ?? [];

        return signeeContexts;
    }
}
