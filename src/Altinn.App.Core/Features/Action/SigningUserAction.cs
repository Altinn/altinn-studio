using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Internal.Sign;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Signee = Altinn.App.Core.Internal.Sign.Signee;

namespace Altinn.App.Core.Features.Action;

/// <summary>
/// Class handling tasks that should happen when action signing is performed.
/// </summary>
public class SigningUserAction : IUserAction
{
    private readonly IProcessReader _processReader;
    private readonly ILogger<SigningUserAction> _logger;
    private readonly IProfileClient _profileClient;
    private readonly ISignClient _signClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="SigningUserAction"/> class
    /// </summary>
    /// <param name="processReader">The process reader</param>
    /// <param name="logger">The logger</param>
    /// <param name="profileClient">The profile client</param>
    /// <param name="signClient">The sign client</param>
    public SigningUserAction(IProcessReader processReader, ILogger<SigningUserAction> logger, IProfileClient profileClient, ISignClient signClient)
    {
        _logger = logger;
        _profileClient = profileClient;
        _signClient = signClient;
        _processReader = processReader;
    }

    /// <inheritdoc />
    public string Id => "sign";

    /// <inheritdoc />
    /// <exception cref="Altinn.App.Core.Helpers.PlatformHttpException"></exception>
    /// <exception cref="Altinn.App.Core.Internal.App.ApplicationConfigException"></exception>
    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        if (context.UserId == null)
        {
            return UserActionResult.FailureResult(
                error: new ActionError()
                {
                    Code = "NoUserId",
                    Message = "User id is missing in token"
                },
                errorType: ProcessErrorType.Unauthorized);
        }
        if (_processReader.GetFlowElement(context.Instance.Process.CurrentTask.ElementId) is ProcessTask currentTask)
        {
            _logger.LogInformation("Signing action handler invoked for instance {Id}. In task: {CurrentTaskId}", context.Instance.Id, currentTask.Id);
            var dataTypes = currentTask.ExtensionElements?.TaskExtension?.SignatureConfiguration?.DataTypesToSign ?? new();
            var connectedDataElements = GetDataElementSignatures(context.Instance.Data, dataTypes);
            if (connectedDataElements.Count > 0 && currentTask.ExtensionElements?.TaskExtension?.SignatureConfiguration?.SignatureDataType != null)
            {
                SignatureContext signatureContext = new SignatureContext(new InstanceIdentifier(context.Instance), currentTask.ExtensionElements?.TaskExtension?.SignatureConfiguration?.SignatureDataType!, await GetSignee(context.UserId.Value), connectedDataElements);
                await _signClient.SignDataElements(signatureContext);
                return UserActionResult.SuccessResult();
            }

            throw new ApplicationConfigException("Missing configuration for signing. Check that the task has a signature configuration and that the data types to sign are defined.");
        }

        return UserActionResult.FailureResult(new ActionError()
        {
            Code = "NoProcessTask",
            Message = "Current task is not a process task."
        });
    }

    private static List<DataElementSignature> GetDataElementSignatures(List<DataElement> dataElements, List<string> dataTypesToSign)
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