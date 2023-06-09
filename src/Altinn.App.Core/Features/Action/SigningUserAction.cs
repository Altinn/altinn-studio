using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.UserAction;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Signee = Altinn.App.Core.Internal.Sign.Signee;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Class handling tasks that should happen when action signing is performed.
/// </summary>
public class SigningUserAction: IUserAction
{
    private readonly IProcessReader _processReader;
    private readonly ILogger<SigningUserAction> _logger;
    private readonly IAppMetadata _appMetadata;
    private readonly IProfileClient _profileClient;
    private readonly ISignClient _signClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="SigningUserAction"/> class
    /// </summary>
    /// <param name="processReader">The process reader</param>
    /// <param name="logger">The logger</param>
    /// <param name="appMetadata">The application metadata service</param>
    public SigningUserAction(IProcessReader processReader, ILogger<SigningUserAction> logger, IAppMetadata appMetadata, IProfileClient profileClient, ISignClient signClient)
    {
        _logger = logger;
        _appMetadata = appMetadata;
        _profileClient = profileClient;
        _signClient = signClient;
        _processReader = processReader;
    }
    
    /// <inheritdoc />
    public string Id => "sign";

    /// <inheritdoc />
    /// <exception cref="Altinn.App.Core.Helpers.PlatformHttpException"></exception>
    public async Task<bool> HandleAction(UserActionContext context)
    {
        if (_processReader.GetFlowElement(context.Instance.Process.CurrentTask.ElementId) is ProcessTask currentTask)
        {
            _logger.LogInformation("Signing action handler invoked for instance {Id}. In task: {CurrentTaskId}", context.Instance.Id, currentTask.Id);
            var dataTypes = currentTask.ExtensionElements?.TaskExtension?.DataTypesToSign ?? new();
            var connectedDataElements = GetDataElementSignatures(context.Instance.Data, dataTypes);
            if (connectedDataElements.Count > 0)
            {
                SignatureContext signatureContext = new SignatureContext(new InstanceIdentifier(context.Instance), currentTask.ExtensionElements?.TaskExtension?.SignatureDataType, await GetSignee(context.UserId), connectedDataElements);
                await _signClient.SignDataElements(signatureContext);
            }
            return true;
        }

        return false;
    }

    private List<DataElementSignature> GetDataElementSignatures(List<DataElement> dataElements, List<string> dataTypesToSign)
    {
        var connectedDataElements = new List<DataElementSignature>();
        foreach (var dataType in dataTypesToSign)
        {
            connectedDataElements.AddRange(dataElements.Where(d => d.DataType.Equals(dataType, StringComparison.OrdinalIgnoreCase)).Select(d => new DataElementSignature(d.Id)));
        }

        return connectedDataElements;
    }

    private async Task<Signee> GetSignee(int userId)
    {
        var userProfile = await _profileClient.GetUserProfile(userId);
        return new Signee
        {
            UserId = userProfile.UserId.ToString(),
            PersonNumber = userProfile.Party.SSN,
            OrganisationNumber = userProfile.Party.OrgNumber,
        };
    }
}