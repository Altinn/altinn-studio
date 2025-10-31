using System.Globalization;
using System.Text.Json;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Implementation of IUserActionAuthorizer that checks if a signature is unique from other signatures defined in the list of dataTypes under uniqueFromSignaturesInDataTypes inside the bpmn file
/// </summary>
public class UniqueSignatureAuthorizer : IUserActionAuthorizer
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    private readonly IAppMetadata _appMetadata;
    private readonly IProcessReader _processReader;
    private readonly IInstanceClient _instanceClient;
    private readonly IDataClient _dataClient;

    /// <summary>
    /// Intializes a new instance of the <see cref="UniqueSignatureAuthorizer"/> class
    /// </summary>
    /// <param name="processReader">The process reader</param>
    /// <param name="instanceClient">The instance client</param>
    /// <param name="dataClient">The data client</param>
    /// <param name="appMetadata">The application metadata</param>
    public UniqueSignatureAuthorizer(
        IProcessReader processReader,
        IInstanceClient instanceClient,
        IDataClient dataClient,
        IAppMetadata appMetadata
    )
    {
        _processReader = processReader;
        _instanceClient = instanceClient;
        _dataClient = dataClient;
        _appMetadata = appMetadata;
    }

    /// <inheritdoc />
    public async Task<bool> AuthorizeAction(UserActionAuthorizerContext context)
    {
        if (context.TaskId == null)
        {
            return true;
        }
        var flowElement = _processReader.GetFlowElement(context.TaskId) as ProcessTask;
        if (
            flowElement?.ExtensionElements?.TaskExtension?.SignatureConfiguration?.UniqueFromSignaturesInDataTypes.Count
            > 0
        )
        {
            var appMetadata = await _appMetadata.GetApplicationMetadata();
            var instance = await _instanceClient.GetInstance(
                appMetadata.AppIdentifier.App,
                appMetadata.AppIdentifier.Org,
                context.InstanceIdentifier.InstanceOwnerPartyId,
                context.InstanceIdentifier.InstanceGuid
            );
            var dataTypes = flowElement
                .ExtensionElements
                .TaskExtension
                .SignatureConfiguration
                .UniqueFromSignaturesInDataTypes;
            var signatureDataElements = instance.Data.Where(d => dataTypes.Contains(d.DataType)).ToList();
            foreach (var signatureDataElement in signatureDataElements)
            {
                var signee = await GetSigneeFromSignDocument(context.InstanceIdentifier, signatureDataElement);
                bool unauthorized = context.Authentication switch
                {
                    Authenticated.User a => a.UserId.ToString(CultureInfo.InvariantCulture) == signee?.UserId,
                    Authenticated.SystemUser a => a.SystemUserId[0] == signee?.SystemUserId,
                    _ => false,
                };
                if (unauthorized)
                {
                    return false;
                }
            }
        }

        return true;
    }

    private async Task<Signee?> GetSigneeFromSignDocument(
        InstanceIdentifier instanceIdentifier,
        DataElement dataElement
    )
    {
        await using var data = await _dataClient.GetBinaryData(
            instanceIdentifier.InstanceOwnerPartyId,
            instanceIdentifier.InstanceGuid,
            Guid.Parse(dataElement.Id)
        );
        try
        {
            var signDocument = await JsonSerializer.DeserializeAsync<SignDocument>(data, _jsonSerializerOptions);
            return signDocument?.SigneeInfo;
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
