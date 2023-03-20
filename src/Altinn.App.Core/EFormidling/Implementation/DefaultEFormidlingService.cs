using Altinn.App.Core.Configuration;
using Altinn.App.Core.Constants;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.Common.AccessTokenClient.Services;
using Altinn.Common.EFormidlingClient;
using Altinn.Common.EFormidlingClient.Models.SBD;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Utils;
using Microsoft.AspNetCore.Http;
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
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly AppSettings? _appSettings;
    private readonly PlatformSettings? _platformSettings;
    private readonly IEFormidlingClient? _eFormidlingClient;
    private readonly IEFormidlingMetadata? _eFormidlingMetadata;
    private readonly IAppMetadata _appMetadata;
    private readonly IData _dataClient;
    private readonly IEFormidlingReceivers _eFormidlingReceivers;
    private readonly IEvents _eventClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="DefaultEFormidlingService"/> class.
    /// </summary>    
    public DefaultEFormidlingService(
        ILogger<DefaultEFormidlingService> logger,
        IHttpContextAccessor httpContextAccessor,
        IAppMetadata appMetadata,
        IData dataClient,
        IEFormidlingReceivers eFormidlingReceivers,
        IEvents eventClient,
        IOptions<AppSettings>? appSettings = null,
        IOptions<PlatformSettings>? platformSettings = null,
        IEFormidlingClient? eFormidlingClient = null,
        IAccessTokenGenerator? tokenGenerator = null,
        IEFormidlingMetadata? eFormidlingMetadata = null)
    {
        _logger = logger;
        _tokenGenerator = tokenGenerator;
        _httpContextAccessor = httpContextAccessor;
        _appSettings = appSettings?.Value;
        _platformSettings = platformSettings?.Value;
        _eFormidlingClient = eFormidlingClient;
        _eFormidlingMetadata = eFormidlingMetadata;
        _appMetadata = appMetadata;
        _dataClient = dataClient;
        _eFormidlingReceivers = eFormidlingReceivers;
        _eventClient = eventClient;
    }

    /// <inheritdoc />
    public async Task SendEFormidlingShipment(Instance instance)
    {
        if (_eFormidlingClient == null || _tokenGenerator == null || _eFormidlingMetadata == null ||
            _appSettings == null || _platformSettings == null)
        {
            throw new EntryPointNotFoundException(
                "eFormidling support has not been correctly configured in App.cs. " +
                "Ensure that IEformidlingClient and IAccessTokenGenerator are included in the base constructor.");
        }

        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();

        string accessToken = _tokenGenerator.GenerateAccessToken(applicationMetadata.Org, applicationMetadata.AppIdentifier.App);
        string authzToken = JwtTokenUtil.GetTokenFromContext(_httpContextAccessor.HttpContext, _appSettings.RuntimeCookieName);

        var requestHeaders = new Dictionary<string, string>
        {
            { "Authorization", $"Bearer {authzToken}" },
            { General.EFormidlingAccessTokenHeaderName, accessToken },
            { General.SubscriptionKeyHeaderName, _platformSettings.SubscriptionKey }
        };

        string instanceGuid = instance.Id.Split("/")[1];

        StandardBusinessDocument sbd = await ConstructStandardBusinessDocument(instanceGuid, instance);
        await _eFormidlingClient.CreateMessage(sbd, requestHeaders);

        (string metadataName, Stream stream) = await _eFormidlingMetadata.GenerateEFormidlingMetadata(instance);

        using (stream)
        {
            await _eFormidlingClient.UploadAttachment(stream, instanceGuid, metadataName, requestHeaders);
        }

        await SendInstanceData(instance, requestHeaders);

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

    private async Task<StandardBusinessDocument> ConstructStandardBusinessDocument(string instanceGuid,
        Instance instance)
    {
        DateTime completedTime = DateTime.Now;

        Sender digdirSender = new Sender
        {
            Identifier = new Identifier
            {
                // 0192 prefix for all Norwegian organisations.
                Value = $"0192:{_appSettings.EFormidlingSender}",
                Authority = "iso6523-actorid-upis"
            }
        };

        List<Receiver> receivers = await _eFormidlingReceivers.GetEFormidlingReceivers(instance);
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();

        Scope scope =
            new Scope
            {
                Identifier = appMetadata.EFormidling.Process,
                InstanceIdentifier = Guid.NewGuid().ToString(),
                Type = "ConversationId",
                ScopeInformation = new List<ScopeInformation>
                {
                    new ScopeInformation
                    {
                        ExpectedResponseDateTime = completedTime.AddHours(2)
                    }
                },
            };

        BusinessScope businessScope = new BusinessScope
        {
            Scope = new List<Scope> { scope }
        };

        DocumentIdentification documentIdentification = new DocumentIdentification
        {
            InstanceIdentifier = instanceGuid,
            Standard = appMetadata.EFormidling.Standard,
            TypeVersion = appMetadata.EFormidling.TypeVersion,
            CreationDateAndTime = completedTime,
            Type = appMetadata.EFormidling.Type
        };

        StandardBusinessDocumentHeader sbdHeader = new StandardBusinessDocumentHeader
        {
            HeaderVersion = "1.0",
            BusinessScope = businessScope,
            DocumentIdentification = documentIdentification,
            Receiver = receivers,
            Sender = new List<Sender> { digdirSender }
        };

        StandardBusinessDocument sbd = new StandardBusinessDocument
        {
            StandardBusinessDocumentHeader = sbdHeader,
            Arkivmelding = new Arkivmelding { Sikkerhetsnivaa = appMetadata.EFormidling.SecurityLevel },
        };

        if (!string.IsNullOrEmpty(appMetadata.EFormidling.DPFShipmentType))
        {
            sbd.Arkivmelding.DPF = new() { ForsendelsesType = appMetadata.EFormidling.DPFShipmentType };
        }

        return sbd;
    }

    private async Task SendInstanceData(Instance instance, Dictionary<string, string> requestHeaders)
    {
        ApplicationMetadata applicationMetadata = await _appMetadata.GetApplicationMetadata();
        
        Guid instanceGuid = Guid.Parse(instance.Id.Split("/")[1]);
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
        foreach (DataElement dataElement in instance.Data)
        {
            if (!applicationMetadata.EFormidling.DataTypes.Contains(dataElement.DataType))
            {
                continue;
            }

            bool appLogic =
                applicationMetadata.DataTypes.Any(d => d.Id == dataElement.DataType && d.AppLogic?.ClassRef != null);

            string fileName = appLogic ? $"{dataElement.DataType}.xml" : dataElement.Filename;
            using Stream stream = await _dataClient.GetBinaryData(applicationMetadata.Org, applicationMetadata.AppIdentifier.App, instanceOwnerPartyId, instanceGuid,
                new Guid(dataElement.Id));

            bool successful = await _eFormidlingClient!.UploadAttachment(stream, instanceGuid.ToString(), fileName, requestHeaders);

            if (!successful)
            {
                _logger.LogError(
                    "// AppBase // SendInstanceData // DataElement {DataElementId} was not sent with shipment for instance {InstanceId} failed",
                    dataElement.Id, instance.Id);
            }
        }
    }
}
