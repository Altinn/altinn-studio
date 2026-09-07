using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Altinn.App.Core.Features.Signing.Exceptions;
using Altinn.App.Core.Features.Signing.Extensions;
using Altinn.App.Core.Features.Signing.Helpers;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Registers;
using Altinn.App.Core.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using Signee = Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Features.Signing.Services;

internal sealed class SigneeContextsManager(
    IAltinnPartyClient altinnPartyClient,
    IInstanceClient instanceClient,
    AppImplementationFactory appImplementationFactory,
    IAppMetadata appMetadata,
    ILogger<SigneeContextsManager> logger,
    Telemetry? telemetry = null
) : ISigneeContextsManager
{
    private const string ApplicationJsonContentType = "application/json";

    private static readonly JsonSerializerOptions _jsonSerializerOptions = SigneeStateSerialization.Options;

    /// <inheritdoc />
    public async Task<List<SigneeContext>> GenerateSigneeContexts(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    )
    {
        using Activity? activity = telemetry?.StartGenerateSigneeContextsActivity();

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

        logger.LogInformation(
            "Assigning {SigneeContextsCount} signees to task {TaskId}.",
            signeeContexts.Count,
            taskId
        );
        logger.LogDebug(
            "Signee context state: {SigneeContexts}",
            JsonSerializer.Serialize(signeeContexts, _jsonSerializerOptions)
        );

        return signeeContexts;
    }

    /// <inheritdoc />
    public async Task<List<SigneeContext>> GetSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        CancellationToken ct
    )
    {
        using Activity? activity = telemetry?.StartReadSigneesContextsActivity();
        // If no SigneeStatesDataTypeId is set, delegated signing is not enabled and there is nothing to download.
        List<SigneeContext> signeeContexts = !string.IsNullOrEmpty(signatureConfiguration.SigneeStatesDataTypeId)
            ? await DownloadSigneeContexts(instanceDataAccessor, signatureConfiguration)
            : [];

        return signeeContexts;
    }

    /// <inheritdoc />
    public DataElement? FindTaskSigneeStateElement(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId
    )
    {
        string dataTypeId = GetSigneeStatesDataTypeId(signatureConfiguration);
        return PickOne(
            instanceDataAccessor
                .GetDataElementsForType(dataTypeId)
                .Where(dataElement => IsGeneratedFromTask(dataElement, taskId))
                .ToList(),
            $"tagged with task '{taskId}'"
        );
    }

    /// <inheritdoc />
    public async Task<DataElement?> RefreshTaskSigneeStateElementFromStorage(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        CancellationToken ct
    )
    {
        string dataTypeId = GetSigneeStatesDataTypeId(signatureConfiguration);
        Instance stored = await instanceClient.GetInstance(
            instanceDataMutator.Instance,
            StorageAuthenticationMethod.ServiceOwner(),
            ct
        );

        List<DataElement> storedStateElements = (stored.Data ?? [])
            .Where(dataElement => dataElement.DataType == dataTypeId)
            .ToList();
        DataElement? persisted = PickOne(
            storedStateElements.Where(dataElement => IsGeneratedFromTask(dataElement, taskId)).ToList(),
            $"tagged with task '{taskId}' in Storage"
        );
        List<DataElement> instanceData = instanceDataMutator.Instance.Data ??= [];
        if (persisted is not null && instanceData.All(dataElement => dataElement.Id != persisted.Id))
        {
            logger.LogWarning(
                "Adopting signee state element {DataElementId} for task {TaskId} from Storage: an earlier attempt "
                    + "of this step created it, but its response never reached the workflow engine.",
                persisted.Id,
                taskId
            );
        }

        instanceData.RemoveAll(dataElement => dataElement.DataType == dataTypeId);
        instanceData.AddRange(storedStateElements);

        return persisted;
    }

    /// <inheritdoc />
    public void RemoveOtherSigneeStateElements(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId
    )
    {
        string dataTypeId = GetSigneeStatesDataTypeId(signatureConfiguration);
        List<DataElement> others = instanceDataMutator
            .GetDataElementsForType(dataTypeId)
            .Where(dataElement => !IsGeneratedFromTask(dataElement, taskId))
            .ToList();

        foreach (DataElement other in others)
        {
            logger.LogInformation(
                "Removing signee state element {DataElementId} of task {TaskId}: it is not tagged with this task "
                    + "(a previous version of the app, or another visit).",
                other.Id,
                taskId
            );
            instanceDataMutator.RemoveDataElement(other);
        }
    }

    /// <inheritdoc />
    public async Task<List<SigneeContext>> LoadSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration,
        DataElement signeeStateDataElement
    )
    {
        await OverrideAuthentication(instanceDataAccessor, signatureConfiguration);
        return await Deserialize(instanceDataAccessor, signeeStateDataElement);
    }

    /// <inheritdoc />
    public async Task PersistSigneeContexts(
        IInstanceDataMutator instanceDataMutator,
        AltinnSignatureConfiguration signatureConfiguration,
        string taskId,
        List<SigneeContext> signeeContexts
    )
    {
        string dataTypeId = GetSigneeStatesDataTypeId(signatureConfiguration);
        await OverrideAuthentication(instanceDataMutator, signatureConfiguration);

        byte[] bytes = JsonSerializer.SerializeToUtf8Bytes(signeeContexts, _jsonSerializerOptions);
        DataElement? existing = FindTaskSigneeStateElement(instanceDataMutator, signatureConfiguration, taskId);
        if (existing is not null)
        {
            instanceDataMutator.UpdateBinaryDataElement(existing, ApplicationJsonContentType, bytes);
            return;
        }

        instanceDataMutator.AddBinaryDataElement(
            dataTypeId: dataTypeId,
            contentType: ApplicationJsonContentType,
            filename: null,
            bytes: bytes,
            generatedFromTask: taskId
        );
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

        List<ISigneeProvider> matchingSigneeProviders = appImplementationFactory
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
        Signee signee;
        try
        {
            signee = await From(providedSignee, (PartyLookup lookup) => altinnPartyClient.LookupParty(lookup));
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception exception)
        {
            SigningFailureClassification classification = SigningFailureClassifier.ClassifyPartyLookup(exception, ct);
            if (classification.IsTransient)
            {
                throw;
            }

            throw new SigneeInitializationPermanentException(
                $"A signee's party could not be resolved: {classification.Reason}. Correct the signee data before resuming the transition."
            );
        }
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
            AdditionalActionsToDelegate = providedSignee.AdditionalActionsToDelegate,
            Signee = signee,
        };
    }

    private async Task<List<SigneeContext>> DownloadSigneeContexts(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration
    )
    {
        string signeeStatesDataTypeId = GetSigneeStatesDataTypeId(signatureConfiguration);
        await OverrideAuthentication(instanceDataAccessor, signatureConfiguration);

        DataElement? signeeStateDataElement = PickOne(
            instanceDataAccessor.GetDataElementsForType(signeeStatesDataTypeId).ToList(),
            "of the signee state data type"
        );

        if (signeeStateDataElement is null)
        {
            logger.LogInformation("Didn't find any signee states for task.");
            return [];
        }

        return await Deserialize(instanceDataAccessor, signeeStateDataElement);
    }

    private static async Task<List<SigneeContext>> Deserialize(
        IInstanceDataAccessor instanceDataAccessor,
        DataElement signeeStateDataElement
    )
    {
        ReadOnlyMemory<byte> data = await instanceDataAccessor.GetBinaryData(signeeStateDataElement);
        string signeeStateSerialized = Encoding.UTF8.GetString(data.ToArray());

        return JsonSerializer.Deserialize<List<SigneeContext>>(signeeStateSerialized, _jsonSerializerOptions) ?? [];
    }

    private async Task OverrideAuthentication(
        IInstanceDataAccessor instanceDataAccessor,
        AltinnSignatureConfiguration signatureConfiguration
    )
    {
        ApplicationMetadata applicationMetadata = await appMetadata.GetApplicationMetadata();
        instanceDataAccessor.OverrideAuthenticationMethodForRestrictedDataTypes(
            applicationMetadata,
            [GetSigneeStatesDataTypeId(signatureConfiguration)],
            StorageAuthenticationMethod.ServiceOwner()
        );
    }

    /// <summary>
    /// The one element among candidates that should be exactly one. Two can exist after a lost callback response
    /// duplicated a create; rather than failing every read of the signing task, the most recently changed one is
    /// used and the duplicate is reported.
    /// </summary>
    private DataElement? PickOne(List<DataElement> candidates, string description)
    {
        if (candidates.Count <= 1)
        {
            return candidates.SingleOrDefault();
        }

        logger.LogError(
            "Found {Count} signee state elements {Description} where exactly one is expected: {DataElementIds}. "
                + "Using the most recently changed one; remove the others.",
            candidates.Count,
            description,
            string.Join(", ", candidates.Select(dataElement => dataElement.Id))
        );
        return candidates.OrderByDescending(dataElement => dataElement.LastChanged ?? DateTime.MinValue).First();
    }

    private static bool IsGeneratedFromTask(DataElement dataElement, string taskId) =>
        dataElement.References?.Exists(reference =>
            reference.Relation == RelationType.GeneratedFrom
            && reference.ValueType == ReferenceType.Task
            && reference.Value == taskId
        )
            is true;

    private static string GetSigneeStatesDataTypeId(AltinnSignatureConfiguration signatureConfiguration) =>
        signatureConfiguration.SigneeStatesDataTypeId
        ?? throw new ApplicationConfigException("SigneeStatesDataTypeId is not set in the signature configuration.");
}
