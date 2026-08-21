using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.EFormidling.Models;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Arkivmelding = Altinn.Common.EFormidlingClient.Models.SBD.Arkivmelding;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// Default implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingService"/>,
/// registered by <c>AddEFormidling()</c>. An app replaces it by implementing the interface,
/// not by deriving from or wrapping this class — which is why it is internal.
/// </summary>
internal sealed class DefaultEFormidlingService : IEFormidlingService
{
    /// <summary>
    /// How long the integrasjonspunkt lets the shipment live: it reads this from the SBD's
    /// <c>expectedResponseDateTime</c> and marks the message <c>levetid_utlopt</c> once it passes. Its
    /// own 24-hour default applies only when the field is absent, which the frozen client model does not
    /// allow. Long-standing value, kept deliberately; the service task's delivery wait is sized to
    /// outlast it so an expired shipment fails with the integrasjonspunkt's verdict rather than ours.
    /// </summary>
    private static readonly TimeSpan _shipmentLifetime = TimeSpan.FromHours(2);

    private readonly ILogger<DefaultEFormidlingService> _logger;
    private readonly IAccessTokenGenerator? _tokenGenerator;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly AppSettings? _appSettings;
    private readonly PlatformSettings? _platformSettings;
    private readonly IEFormidlingClient? _eFormidlingClient;
    private readonly IAppMetadata _appMetadata;
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="DefaultEFormidlingService"/> class.
    /// </summary>
    public DefaultEFormidlingService(
        ILogger<DefaultEFormidlingService> logger,
        IUserTokenProvider userTokenProvider,
        IAppMetadata appMetadata,
        IServiceProvider sp,
        IOptions<AppSettings>? appSettings = null,
        IOptions<PlatformSettings>? platformSettings = null,
        IEFormidlingClient? eFormidlingClient = null,
        IAccessTokenGenerator? tokenGenerator = null
    )
    {
        _logger = logger;
        _tokenGenerator = tokenGenerator;
        _appSettings = appSettings?.Value;
        _platformSettings = platformSettings?.Value;
        _userTokenProvider = userTokenProvider;
        _eFormidlingClient = eFormidlingClient;
        _appMetadata = appMetadata;
        _appImplementationFactory = sp.GetRequiredService<AppImplementationFactory>();
    }

    /// <inheritdoc />
    public async Task SendEFormidlingShipment(
        IInstanceDataAccessor dataAccessor,
        ValidAltinnEFormidlingConfiguration configuration,
        CancellationToken cancellationToken = default
    )
    {
        var metadata = _appImplementationFactory.Get<IEFormidlingMetadata>();
        if (
            _eFormidlingClient == null
            || _tokenGenerator == null
            || metadata == null
            || _appSettings == null
            || _platformSettings == null
        )
        {
            throw new EntryPointNotFoundException(
                "eFormidling support has not been correctly configured in App.cs. "
                    + "Ensure that IEformidlingClient and IAccessTokenGenerator are included in the base constructor."
            );
        }

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        string userToken = _userTokenProvider.GetUserToken();
        string platformAccessToken = _tokenGenerator.GenerateAccessToken(
            applicationMetadata.Org,
            applicationMetadata.AppIdentifier.App
        );

        var requestHeaders = new Dictionary<string, string>
        {
            { "Authorization", $"{AuthorizationSchemes.Bearer} {userToken}" },
            { General.EFormidlingAccessTokenHeaderName, platformAccessToken },
            { General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey },
        };

        Instance instance = dataAccessor.Instance;
        string instanceGuid = instance.Id.Split("/")[1];

        StandardBusinessDocument sbd = await ConstructStandardBusinessDocument(
            instanceGuid,
            configuration,
            dataAccessor
        );

        // The message id is the instance guid, so a retry of a send that already reached the
        // integrasjonspunkt fails with MessageAlreadyExistsException on create. Instead of leaving
        // the instance permanently stuck (the retry can never use a fresh id), resume the existing
        // message: skip everything if it already left the outbox, otherwise finish the upload/send
        // steps the earlier attempt did not complete.
        bool resumingExistingMessage = false;

        // Safe to abandon between calls, for the same reason: a created-but-unsent message is exactly
        // what the recovery above resumes. The client takes no token, so these seams are as fine-grained
        // as cancellation gets.
        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            await _eFormidlingClient.CreateMessage(sbd, requestHeaders);
        }
        catch (WebException e) when (IsMessageAlreadyExistsError(e))
        {
            Statuses statuses = await _eFormidlingClient.GetMessageStatusById(instanceGuid, requestHeaders);
            if (EFormidlingStatusReader.HasLeftOutbox(statuses))
            {
                _logger.LogInformation(
                    "eFormidling message {MessageId} already exists and has been sent; treating as an idempotent retry.",
                    instanceGuid
                );
                return;
            }

            ThrowIfMessageFailed(statuses, instanceGuid);

            _logger.LogInformation(
                "eFormidling message {MessageId} already exists but has not been sent; resuming attachment upload and send.",
                instanceGuid
            );
            resumingExistingMessage = true;
        }

        cancellationToken.ThrowIfCancellationRequested();
        (string metadataFilename, Stream stream) = await metadata.GenerateEFormidlingMetadata(dataAccessor);

        await using (stream)
        {
            try
            {
                await _eFormidlingClient.UploadAttachment(stream, instanceGuid, metadataFilename, requestHeaders);
            }
            catch (WebException e) when (resumingExistingMessage)
            {
                _logger.LogWarning(
                    e,
                    "Re-upload of eFormidling metadata {Filename} failed while resuming message {MessageId}; assuming it was uploaded by the earlier attempt.",
                    metadataFilename,
                    instanceGuid
                );
            }
        }

        await SendInstanceData(
            dataAccessor,
            requestHeaders,
            metadataFilename,
            configuration,
            resumingExistingMessage,
            cancellationToken
        );

        cancellationToken.ThrowIfCancellationRequested();
        try
        {
            await _eFormidlingClient.SendMessage(instanceGuid, requestHeaders);
        }
        catch
        {
            _logger.LogError("Shipment of instance {InstanceId} to Eformidling failed", instance.Id);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<EFormidlingShipmentStatus> GetEFormidlingShipmentStatus(
        IInstanceDataAccessor dataAccessor,
        ValidAltinnEFormidlingConfiguration configuration,
        CancellationToken cancellationToken = default
    )
    {
        cancellationToken.ThrowIfCancellationRequested();
        ArgumentNullException.ThrowIfNull(_eFormidlingClient);
        ArgumentNullException.ThrowIfNull(_platformSettings);

        string instanceGuid = dataAccessor.Instance.Id.Split("/")[1];

        // Only the subscription key, matching what the status query has always sent: this is a read
        // through the platform gateway, not an operation on the instance's behalf.
        var requestHeaders = new Dictionary<string, string>
        {
            { General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey },
        };

        Statuses statuses = await _eFormidlingClient.GetMessageStatusById(instanceGuid, requestHeaders);
        EFormidlingShipmentStatus status = EFormidlingStatusReader.Classify(statuses);

        _logger.LogInformation(
            "eFormidling message {MessageId} is {State} (status '{Status}'). Reported statuses: {ReportedStatuses}.",
            instanceGuid,
            status.State,
            status.Status,
            string.Join(",", statuses?.Content?.Select(s => s.Status) ?? [])
        );

        return status;
    }

    private async Task<StandardBusinessDocument> ConstructStandardBusinessDocument(
        string instanceGuid,
        ValidAltinnEFormidlingConfiguration config,
        IInstanceDataAccessor dataAccessor
    )
    {
        if (_appSettings is null)
        {
            throw new Exception("AppSettings not initialized");
        }

        DateTime completedTime = DateTime.UtcNow;

        Sender digdirSender = new Sender
        {
            Identifier = new Identifier
            {
                // 0192 prefix for all Norwegian organizations.
                Value = $"0192:{_appSettings.EFormidlingSender}",
                Authority = "iso6523-actorid-upis",
            },
        };

        var eFormidlingReceivers = _appImplementationFactory.GetRequired<IEFormidlingReceivers>();
        List<Receiver> receivers = await eFormidlingReceivers.GetEFormidlingReceivers(dataAccessor, config.Receiver);

        Scope scope = new Scope
        {
            Identifier = config.Process,
            InstanceIdentifier = Guid.NewGuid().ToString(),
            Type = "ConversationId",
            ScopeInformation = new List<ScopeInformation>
            {
                new ScopeInformation { ExpectedResponseDateTime = completedTime.Add(_shipmentLifetime) },
            },
        };

        BusinessScope businessScope = new BusinessScope { Scope = new List<Scope> { scope } };

        DocumentIdentification documentIdentification = new DocumentIdentification
        {
            InstanceIdentifier = instanceGuid,
            Standard = config.Standard,
            TypeVersion = config.TypeVersion,
            CreationDateAndTime = completedTime,
            Type = config.Type,
        };

        StandardBusinessDocumentHeader sbdHeader = new StandardBusinessDocumentHeader
        {
            HeaderVersion = "1.0",
            BusinessScope = businessScope,
            DocumentIdentification = documentIdentification,
            Receiver = receivers,
            Sender = new List<Sender> { digdirSender },
        };

        StandardBusinessDocument sbd = new StandardBusinessDocument
        {
            StandardBusinessDocumentHeader = sbdHeader,
            Arkivmelding = new Arkivmelding { Sikkerhetsnivaa = config.SecurityLevel },
        };

        if (!string.IsNullOrEmpty(config.DpfShipmentType))
        {
            sbd.Arkivmelding.DPF = new() { ForsendelsesType = config.DpfShipmentType };
        }

        return sbd;
    }

    /// <summary>
    /// Identifies the integrasjonspunkt's duplicate-message error. The eFormidling client wraps the
    /// error response in a <see cref="WebException"/> with the JSON body interpolated into the
    /// message, so the structured <c>exception</c> field has to be dug out of the string.
    /// </summary>
    internal static bool IsMessageAlreadyExistsError(WebException exception)
    {
        string message = exception.Message;
        int start = message.IndexOf('{');
        int end = message.LastIndexOf('}');
        if (start >= 0 && end > start)
        {
            try
            {
                using var body = JsonDocument.Parse(message[start..(end + 1)]);
                if (
                    body.RootElement.TryGetProperty("exception", out JsonElement exceptionName)
                    && exceptionName.GetString()
                        == "no.difi.meldingsutveksling.exceptions.MessageAlreadyExistsException"
                )
                {
                    return true;
                }
            }
            catch (JsonException)
            {
                // Not a JSON body - fall through to the substring match.
            }
        }

        return message.Contains("MessageAlreadyExistsException", StringComparison.Ordinal);
    }

    private static void ThrowIfMessageFailed(Statuses statuses, string messageId)
    {
        if (EFormidlingStatusReader.Classify(statuses) is { State: EFormidlingDeliveryState.Failed } failed)
        {
            throw new EformidlingDeliveryException(
                $"The existing eFormidling message {messageId} has failed with status '{failed.Status}' "
                    + $"({failed.Description}) and its message id cannot be reused. Manual follow-up is required."
            );
        }
    }

    /// <param name="dataAccessor">Reads the shipped instance and its data element content from the current unit of work.</param>
    /// <param name="requestHeaders">Headers for the eFormidling client calls.</param>
    /// <param name="eformidlingMetadataFilename">Filename already claimed by the metadata document.</param>
    /// <param name="config">The validated eFormidling configuration for the task.</param>
    /// <param name="tolerateUploadFailures">
    /// Set when resuming a message created by an earlier attempt, where re-uploading an attachment
    /// that already exists may be rejected. Known blind spot: a <see cref="WebException"/> here
    /// cannot be told apart from a transient failure, so a resume could in principle proceed to
    /// send with an attachment missing - the integrasjonspunkt's duplicate-upload behavior is
    /// unverified. Hence the loud warning per skipped attachment rather than silence.
    /// </param>
    /// <param name="cancellationToken">Checked before each attachment; see the caller's remarks on why abandoning here is safe.</param>
    private async Task SendInstanceData(
        IInstanceDataAccessor dataAccessor,
        Dictionary<string, string> requestHeaders,
        string eformidlingMetadataFilename,
        ValidAltinnEFormidlingConfiguration config,
        bool tolerateUploadFailures = false,
        CancellationToken cancellationToken = default
    )
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        Instance instance = dataAccessor.Instance;
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);

        // Keep track of already used file names to ensure they are unique. eFormidling does not allow duplicate filenames.
        HashSet<string> usedFileNames = [eformidlingMetadataFilename];

        List<string> dataTypeIds = applicationMetadata.DataTypes.Select(x => x.Id).ToList();

        foreach (DataElement dataElement in instance.Data.OrderBy(x => x.Created))
        {
            // The loop worth cancelling: a shipment with many attachments can outlive the step's
            // execution deadline, and each upload is another call the engine is no longer waiting for.
            cancellationToken.ThrowIfCancellationRequested();

            if (!config.DataTypes.Contains(dataElement.DataType))
            {
                continue;
            }

            DataType dataType =
                applicationMetadata.DataTypes.Find(d => d.Id == dataElement.DataType)
                ?? throw new InvalidOperationException(
                    $"DataType {dataElement.DataType} not found in application metadata"
                );

            bool hasAppLogic = dataType.AppLogic?.ClassRef is not null;

            string uniqueFileName = GetUniqueFileName(
                dataElement.Filename,
                dataType.Id,
                hasAppLogic,
                dataTypeIds,
                usedFileNames
            );
            usedFileNames.Add(uniqueFileName);

            using Stream stream = new MemoryStream(
                (await dataAccessor.GetBinaryData(dataElement)).ToArray(),
                writable: false
            );

            Debug.Assert(_eFormidlingClient is not null, "This is validated before use");
            bool successful;
            try
            {
                successful = await _eFormidlingClient.UploadAttachment(
                    stream,
                    instanceGuid.ToString(),
                    uniqueFileName,
                    requestHeaders
                );
            }
            catch (WebException e) when (tolerateUploadFailures)
            {
                _logger.LogWarning(
                    e,
                    "Re-upload of eFormidling attachment {Filename} failed while resuming message {MessageId}; assuming it was uploaded by the earlier attempt.",
                    uniqueFileName,
                    instanceGuid
                );
                continue;
            }

            if (!successful)
            {
                _logger.LogError(
                    "// AppBase // SendInstanceData // DataElement {DataElementId} was not sent with shipment for instance {InstanceId} failed",
                    dataElement.Id,
                    instance.Id
                );
            }
        }
    }

    internal static string GetUniqueFileName(
        string? fileName,
        string dataTypeId,
        bool hasAppLogic,
        List<string> dataTypeIds,
        HashSet<string> usedFileNames
    )
    {
        if (hasAppLogic)
        {
            // Data types with classRef should get filename based on DataType.
            fileName = $"{dataTypeId}.xml";
        }
        else if (string.IsNullOrWhiteSpace(fileName))
        {
            // If no filename is set, default to DataType.
            fileName = dataTypeId;
        }
        else if (
            !dataTypeIds.TrueForAll(id =>
                id == dataTypeId || !fileName.StartsWith(id, StringComparison.OrdinalIgnoreCase)
            )
        )
        {
            // If the file starts with another data types id, prepend the current data type id to avoid stealing the counter-less filename from the AppLogic data element.
            fileName = $"{dataTypeId}-{fileName}";
        }
        string name = Path.GetFileNameWithoutExtension(fileName);
        string extension = Path.GetExtension(fileName);

        // Handle the case where there's no extension.
        string uniqueFileName = string.IsNullOrEmpty(extension) ? name : $"{name}{extension}";
        var counter = 1;

        // Generate unique file name.
        while (usedFileNames.Contains(uniqueFileName))
        {
            uniqueFileName = string.IsNullOrEmpty(extension) ? $"{name}-{counter}" : $"{name}-{counter}{extension}";
            counter++;
        }

        return uniqueFileName;
    }
}
