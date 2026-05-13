using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Auth;
using Altinn.App.Core.Internal.Pdf;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Internal.Data;

/// <summary>
/// Helper class for validating if a user is a valid contributor to a data type.
/// </summary>
/// <remarks>
/// The concept of inline authorization of valid contributors is not widely used and is likely not the best approach for doing authorization on the data type level, but there is no support for it yet in the policy based authorization, so keeping for now.
/// </remarks>
internal class DataElementAccessChecker : IDataElementAccessChecker
{
    private readonly IAuthorizationService _authorizationService;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IAppMetadata _appMetadata;
    private readonly IOptions<AppSettings> _appSettings;
    private readonly IAuthenticationContext _authenticationContext;

    public DataElementAccessChecker(
        IAuthorizationService authorizationService,
        IHttpContextAccessor httpContextAccessor,
        IAuthenticationContext authenticationContext,
        IAppMetadata appMetadata,
        IOptions<AppSettings> appSettings
    )
    {
        _authorizationService = authorizationService;
        _httpContextAccessor = httpContextAccessor;
        _authenticationContext = authenticationContext;
        _appMetadata = appMetadata;
        _appSettings = appSettings;
    }

    /// <inheritdoc />
    public async Task<bool> CanRead(Instance instance, DataType dataType) =>
        await GetReaderProblem(instance, dataType) is null;

    /// <inheritdoc />
    public async Task<bool> CanCreate(
        Instance instance,
        DataType dataType,
        Authenticated? auth = null,
        long? contentLength = null
    ) => await GetCreateProblem(instance, dataType, auth, contentLength) is null;

    /// <inheritdoc />
    public async Task<bool> CanUpdate(Instance instance, DataType dataType, Authenticated? auth = null) =>
        await GetUpdateProblem(instance, dataType, auth) is null;

    /// <inheritdoc />
    public async Task<bool> CanDelete(
        Instance instance,
        DataType dataType,
        Guid dataElementId,
        Authenticated? auth = null
    ) => await GetDeleteProblem(instance, dataType, dataElementId, auth) is null;

    /// <inheritdoc />
    public async Task<ProblemDetails?> GetReaderProblem(Instance instance, DataType dataType)
    {
        if (await HasRequiredActionAuthorization(instance, dataType.ActionRequiredToRead) is false)
        {
            return new ProblemDetails
            {
                Title = "Unauthorized",
                Detail = $"Access denied for data element of type {dataType.Id}",
                Status = StatusCodes.Status403Forbidden,
            };
        }

        return null;
    }

    /// <inheritdoc />
    public async Task<ProblemDetails?> GetReaderProblem(Instance instance, DataElement dataElement)
    {
        ApplicationMetadata appMetadata = await _appMetadata.GetApplicationMetadata();
        DataType dataType =
            appMetadata.DataTypes.FirstOrDefault(x =>
                x.Id.Equals(dataElement.DataType, StringComparison.OrdinalIgnoreCase)
            ) ?? throw new ArgumentException($"Unknown data type {dataElement.DataType}");

        return await GetReaderProblem(instance, dataType);
    }

    // Common checks for create, update and delete
    private async Task<ProblemDetails?> GetMutationProblem(
        Instance instance,
        DataType dataType,
        Authenticated? auth = null
    )
    {
        auth ??= _authenticationContext.Current;

        if (dataType.Id.Equals(PdfService.PdfElementType, StringComparison.OrdinalIgnoreCase))
        {
            return new ProblemDetails
            {
                Title = "Forbidden",
                Detail = $"Data element of type {dataType.Id} cannot be modified",
                Status = StatusCodes.Status403Forbidden,
            };
        }

        // TODO: v9 remove setting and make this check the default (along with making dataType.TaskId into a list)
        if (_appSettings.Value.EnforceDataTypeTaskId && dataType.TaskId is { } expectedTaskId)
        {
            var currentTaskId = instance.Process?.CurrentTask?.ElementId;
            if (!expectedTaskId.Equals(currentTaskId, StringComparison.Ordinal))
            {
                return new ProblemDetails
                {
                    Title = "Conflict with Current Task",
                    Detail =
                        $"Data element of type {dataType.Id} can only be modified in {expectedTaskId} (current task {currentTaskId})",
                    Status = StatusCodes.Status409Conflict,
                };
            }
        }

        if (await HasRequiredActionAuthorization(instance, dataType.ActionRequiredToWrite) is false)
        {
            return new ProblemDetails
            {
                Title = "Unauthorized",
                Detail = $"Access denied for data element of type {dataType.Id}",
                Status = StatusCodes.Status403Forbidden,
            };
        }

        if (!InstanceIsActive(instance))
        {
            return new ProblemDetails
            {
                Title = "Instance Not Active",
                Detail = $"Cannot update data element of archived or deleted instance {instance.Id}",
                Status = StatusCodes.Status409Conflict,
            };
        }

        if (!AllowedContributorsHelper.IsValidContributor(dataType, auth))
        {
            return new ProblemDetails
            {
                Title = "Forbidden",
                Detail = "User is not a valid contributor to the data type",
                Status = StatusCodes.Status403Forbidden,
            };
        }

        return null;
    }

    /// <inheritdoc />
    public async Task<ProblemDetails?> GetCreateProblem(
        Instance instance,
        DataType dataType,
        Authenticated? auth = null,
        long? contentLength = null
    )
    {
        auth ??= _authenticationContext.Current;

        // Run the general mutation checks
        if (await GetMutationProblem(instance, dataType, auth) is { } problemDetails)
        {
            return problemDetails;
        }

        // Verify that we don't exceed the max count for data type on the instance
        int existingElements = instance.Data.Count(d => d.DataType == dataType.Id);
        if (dataType.MaxCount > 0 && existingElements >= dataType.MaxCount)
        {
            return new ProblemDetails
            {
                Title = "Max Count Exceeded",
                Detail = $"Cannot create more than {dataType.MaxCount} data elements of type {dataType.Id}",
                Status = StatusCodes.Status409Conflict,
            };
        }

        // Verify that we don't exceed the max size
        if (contentLength.HasValue && dataType.MaxSize > 0 && contentLength > (long)dataType.MaxSize * 1024 * 1024)
        {
            return new ProblemDetails
            {
                Title = "Max Size Exceeded",
                Detail =
                    $"Cannot create data element of size {contentLength} which exceeds the max size of {dataType.MaxSize} for {dataType.Id}",
                Status = StatusCodes.Status400BadRequest,
            };
        }

        // Verify that only orgs can create data elements when DisallowUserCreate is true
        if (dataType.AppLogic?.DisallowUserCreate == true && auth is not Authenticated.ServiceOwner)
        {
            return new ProblemDetails
            {
                Title = "User Create Disallowed",
                Detail = $"Cannot create data element of type {dataType.Id} as it is disallowed by app logic",
                Status = StatusCodes.Status400BadRequest,
            };
        }

        return null;
    }

    /// <inheritdoc />
    public async Task<ProblemDetails?> GetUpdateProblem(
        Instance instance,
        DataType dataType,
        Authenticated? auth = null
    )
    {
        auth ??= _authenticationContext.Current;

        if (await GetMutationProblem(instance, dataType, auth) is { } problemDetails)
        {
            return problemDetails;
        }

        return null;
    }

    /// <inheritdoc />
    public async Task<ProblemDetails?> GetDeleteProblem(
        Instance instance,
        DataType dataType,
        Guid dataElementId,
        Authenticated? auth = null
    )
    {
        auth ??= _authenticationContext.Current;

        if (await GetMutationProblem(instance, dataType, auth) is { } problemDetails)
        {
            return problemDetails;
        }

        // Kept for compatibility with old app logic
        // Not sure why this restriction is required, but keeping for now
        if (dataType is { AppLogic.ClassRef: not null, MaxCount: 1, MinCount: 1 })
        {
            return new ProblemDetails
            {
                Title = "Cannot Delete main data element",
                Detail = "Cannot delete the only data element of a class with app logic",
                Status = StatusCodes.Status400BadRequest,
            };
        }

        if (dataType.AppLogic?.DisallowUserDelete == true && auth is not Authenticated.ServiceOwner)
        {
            return new ProblemDetails
            {
                Title = "User Delete Disallowed",
                Detail = $"Cannot delete data element of type {dataType.Id} as it is disallowed by app logic",
                Status = StatusCodes.Status400BadRequest,
            };
        }

        return null;
    }

    private static bool InstanceIsActive(Instance i)
    {
        return i?.Status?.Archived is null && i?.Status?.SoftDeleted is null && i?.Status?.HardDeleted is null;
    }

    private async Task<bool> HasRequiredActionAuthorization(Instance instance, string requiredAction)
    {
        if (string.IsNullOrWhiteSpace(requiredAction))
        {
            return true;
        }

        return await _authorizationService.AuthorizeAction(
            new AppIdentifier(instance),
            new InstanceIdentifier(instance),
            _httpContextAccessor.HttpContext?.User ?? throw new InvalidOperationException("No HTTP context available"),
            requiredAction
        );
    }
}
