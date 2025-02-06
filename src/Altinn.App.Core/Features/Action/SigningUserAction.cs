using System.Globalization;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
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
    private readonly IAppMetadata _appMetadata;
    private readonly ILogger<SigningUserAction> _logger;
    private readonly ISignClient _signClient;

    /// <summary>
    /// Initializes a new instance of the <see cref="SigningUserAction"/> class
    /// </summary>
    /// <param name="processReader">The process reader</param>
    /// <param name="logger">The logger</param>
    /// <param name="signClient">The sign client</param>
    /// <param name="appMetadata">The application metadata</param>
    public SigningUserAction(
        IProcessReader processReader,
        ILogger<SigningUserAction> logger,
        ISignClient signClient,
        IAppMetadata appMetadata
    )
    {
        _logger = logger;
        _signClient = signClient;
        _processReader = processReader;
        _appMetadata = appMetadata;
    }

    /// <inheritdoc />
    public string Id => "sign";

    /// <inheritdoc />
    /// <exception cref="Helpers.PlatformHttpException"></exception>
    /// <exception cref="ApplicationConfigException"></exception>
    public async Task<UserActionResult> HandleAction(UserActionContext context)
    {
        if (
            context.Authentication
            is not Authenticated.User
                and not Authenticated.SelfIdentifiedUser
                and not Authenticated.SystemUser
        )
        {
            return UserActionResult.FailureResult(
                error: new ActionError() { Code = "NoUserId", Message = "User id is missing in token" },
                errorType: ProcessErrorType.Unauthorized
            );
        }
        if (_processReader.GetFlowElement(context.Instance.Process.CurrentTask.ElementId) is ProcessTask currentTask)
        {
            _logger.LogInformation(
                "Signing action handler invoked for instance {Id}. In task: {CurrentTaskId}",
                context.Instance.Id,
                currentTask.Id
            );
            var appMetadata = await _appMetadata.GetApplicationMetadata();
            var dataTypeIds =
                currentTask.ExtensionElements?.TaskExtension?.SignatureConfiguration?.DataTypesToSign ?? [];
            var dataTypesToSign = appMetadata
                .DataTypes?.Where(d => dataTypeIds.Contains(d.Id, StringComparer.OrdinalIgnoreCase))
                .ToList();

            if (
                GetDataTypeForSignature(currentTask, context.Instance.Data, dataTypesToSign) is string signatureDataType
            )
            {
                var dataElementSignatures = GetDataElementSignatures(context.Instance.Data, dataTypesToSign);
                SignatureContext signatureContext = new(
                    new InstanceIdentifier(context.Instance),
                    currentTask.Id,
                    signatureDataType,
                    await GetSignee(context),
                    dataElementSignatures
                );
                await _signClient.SignDataElements(signatureContext);
                return UserActionResult.SuccessResult();
            }

            throw new ApplicationConfigException(
                "Missing configuration for signing. Check that the task has a signature configuration and that the data types to sign are defined."
            );
        }

        return UserActionResult.FailureResult(
            new ActionError() { Code = "NoProcessTask", Message = "Current task is not a process task." }
        );
    }

    private static string? GetDataTypeForSignature(
        ProcessTask currentTask,
        List<DataElement> dataElements,
        List<DataType>? dataTypesToSign
    )
    {
        var signatureDataType = currentTask.ExtensionElements?.TaskExtension?.SignatureConfiguration?.SignatureDataType;
        if (dataTypesToSign is null or [] || signatureDataType is null)
        {
            return null;
        }

        var dataElementMatchExists = dataElements.Any(de =>
            dataTypesToSign.Any(dt => string.Equals(dt.Id, de.DataType, StringComparison.OrdinalIgnoreCase))
        );
        var allDataTypesAreOptional = dataTypesToSign.All(d => d.MinCount == 0);
        return dataElementMatchExists || allDataTypesAreOptional ? signatureDataType : null;
    }

    private static List<DataElementSignature> GetDataElementSignatures(
        List<DataElement> dataElements,
        List<DataType>? dataTypesToSign
    )
    {
        var connectedDataElements = new List<DataElementSignature>();
        if (dataTypesToSign is null or [])
            return connectedDataElements;
        foreach (var dataType in dataTypesToSign)
        {
            connectedDataElements.AddRange(
                dataElements
                    .Where(d => d.DataType.Equals(dataType.Id, StringComparison.OrdinalIgnoreCase))
                    .Select(d => new DataElementSignature(d.Id))
            );
        }

        return connectedDataElements;
    }

    private static async Task<Signee> GetSignee(UserActionContext context)
    {
        switch (context.Authentication)
        {
            case Authenticated.User user:
            {
                var userProfile = await user.LookupProfile();

                return new Signee
                {
                    UserId = userProfile.UserId.ToString(CultureInfo.InvariantCulture),
                    PersonNumber = userProfile.Party.SSN,
                    OrganisationNumber = userProfile.Party.OrgNumber,
                };
            }
            case Authenticated.SelfIdentifiedUser selfIdentifiedUser:
                return new Signee { UserId = selfIdentifiedUser.UserId.ToString(CultureInfo.InvariantCulture) };
            case Authenticated.SystemUser systemUser:
                return new Signee
                {
                    SystemUserId = systemUser.SystemUserId[0],
                    OrganisationNumber = systemUser.SystemUserOrgNr.Get(OrganisationNumberFormat.Local),
                };
            default:
                throw new Exception("Could not get signee");
        }
    }
}
