using System.Diagnostics;
using System.Globalization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Events;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.EFormidling.Implementation;

/// <summary>
/// Default implementation of <see cref="Altinn.App.Core.EFormidling.Interface.IEFormidlingService"/>
/// </summary>
public class DefaultEFormidlingService : IEFormidlingService
{
    private readonly ILogger<DefaultEFormidlingService> _logger;
    private readonly IAccessTokenGenerator? _tokenGenerator;
    private readonly IUserTokenProvider _userTokenProvider;
    private readonly AppSettings? _appSettings;
    private readonly PlatformSettings? _platformSettings;
    private readonly IEFormidlingClient? _eFormidlingClient;
    private readonly IAppMetadata _appMetadata;
    private readonly IDataClient _dataClient;
    private readonly IEventsClient _eventClient;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IEFormidlingLegacyConfigurationProvider _configurationProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="DefaultEFormidlingService"/> class.
    /// </summary>
    public DefaultEFormidlingService(
        ILogger<DefaultEFormidlingService> logger,
        IUserTokenProvider userTokenProvider,
        IAppMetadata appMetadata,
        IDataClient dataClient,
        IEventsClient eventClient,
        IServiceProvider sp,
        IEFormidlingLegacyConfigurationProvider configurationProvider,
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
        _dataClient = dataClient;
        _eventClient = eventClient;
        _appImplementationFactory = sp.GetRequiredService<AppImplementationFactory>();
        _configurationProvider = configurationProvider;
    }

    /// <inheritdoc />
    public async Task SendEFormidlingShipment(Instance instance)
    {
        await SendEFormidlingShipmentInternal(instance, await _configurationProvider.GetLegacyConfiguration());
    }

    /// <inheritdoc />
    public async Task SendEFormidlingShipment(Instance instance, ValidAltinnEFormidlingConfiguration configuration)
    {
        await SendEFormidlingShipmentInternal(instance, configuration);
    }

    private async Task SendEFormidlingShipmentInternal(Instance instance, ValidAltinnEFormidlingConfiguration config)
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

        string instanceGuid = instance.Id.Split("/")[1];

        StandardBusinessDocument sbd = await ConstructStandardBusinessDocument(instanceGuid, instance, config);
        await _eFormidlingClient.CreateMessage(sbd, requestHeaders);

        (string metadataFilename, Stream stream) = await metadata.GenerateEFormidlingMetadata(instance);

        await using (stream)
        {
            await _eFormidlingClient.UploadAttachment(stream, instanceGuid, metadataFilename, requestHeaders);
        }

        await SendInstanceData(instance, requestHeaders, metadataFilename, config);

        try
        {
            await _eFormidlingClient.SendMessage(instanceGuid, requestHeaders);
            _ = await _eventClient.AddEvent(EformidlingConstants.CheckInstanceStatusEventType, instance);
        }
        catch
        {
            _logger.LogError("Shipment of instance {InstanceId} to Eformidling failed", instance.Id);
            throw;
        }
    }

    private async Task<StandardBusinessDocument> ConstructStandardBusinessDocument(
        string instanceGuid,
        Instance instance,
        ValidAltinnEFormidlingConfiguration config
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
                // 0192 prefix for all Norwegian organisations.
                Value = $"0192:{_appSettings.EFormidlingSender}",
                Authority = "iso6523-actorid-upis",
            },
        };

        var eFormidlingReceivers = _appImplementationFactory.GetRequired<IEFormidlingReceivers>();
        List<Receiver> receivers = await eFormidlingReceivers.GetEFormidlingReceivers(instance, config.Receiver);

        Scope scope = new Scope
        {
            Identifier = config.Process,
            InstanceIdentifier = Guid.NewGuid().ToString(),
            Type = "ConversationId",
            ScopeInformation = new List<ScopeInformation>
            {
                new ScopeInformation { ExpectedResponseDateTime = completedTime.AddHours(2) },
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

    private async Task SendInstanceData(
        Instance instance,
        Dictionary<string, string> requestHeaders,
        string eformidlingMetadataFilename,
        ValidAltinnEFormidlingConfiguration config
    )
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId, CultureInfo.InvariantCulture);

        // Keep track of already used file names to ensure they are unique. eFormidling does not allow duplicate filenames.
        HashSet<string> usedFileNames = [eformidlingMetadataFilename];

        List<string> dataTypeIds = applicationMetadata.DataTypes.Select(x => x.Id).ToList();

        foreach (DataElement dataElement in instance.Data.OrderBy(x => x.Created))
        {
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

            await using Stream stream = await _dataClient.GetBinaryData(
                instanceOwnerPartyId,
                instanceGuid,
                new Guid(dataElement.Id)
            );

            Debug.Assert(_eFormidlingClient is not null, "This is validated before use");
            bool successful = await _eFormidlingClient.UploadAttachment(
                stream,
                instanceGuid.ToString(),
                uniqueFileName,
                requestHeaders
            );

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
