using System.Globalization;
using System.Net;
using System.Security.Claims;
using Altinn.App.Core.Extensions;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Helpers;

/// <summary>
/// Helper class for validating if a user is a valid contributor to a data type.
/// </summary>
/// <remarks>
/// The concept of inline authorization of valid contributors is not widely used and is likely not the best approach for doing authorization on the data type level, but there is no support for it yet in the policy based authorization, so keeping for now.
/// </remarks>
internal static class DataElementAccessChecker
{
    internal static bool IsValidContributor(DataType dataType, string? org, int? orgNr)
    {
        if (dataType.AllowedContributers is null || dataType.AllowedContributers.Count == 0)
        {
            return true;
        }

        foreach (string item in dataType.AllowedContributers)
        {
            string key = item.Split(':')[0];
            string value = item.Split(':')[1];

            switch (key.ToLowerInvariant())
            {
                case "org":
                    if (value.Equals(org, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    break;
                case "orgno":
                    if (value.Equals(orgNr?.ToString(CultureInfo.InvariantCulture), StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }

                    break;
            }
        }

        return false;
    }

    /// <summary>
    /// Checks if the user has access to read a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    internal static ProblemDetails? GetReaderProblem(Instance instance, DataType dataType, ClaimsPrincipal user)
    {
        // We don't have any way to restrict reads based on data type yet, so just return null.
        // Might be used if we get a concept of internal server only data types or similar.
        return null;
    }

    // Common checks for create, update and delete
    private static ProblemDetails? GetMutationProblem(Instance instance, DataType dataType, ClaimsPrincipal user)
    {
        if (GetReaderProblem(instance, dataType, user) is { } readProblem)
        {
            return readProblem;
        }
        if (!InstanceIsActive(instance))
        {
            return new ProblemDetails()
            {
                Title = "Instance Not Active",
                Detail = $"Cannot update data element of archived or deleted instance {instance.Id}",
                Status = (int)HttpStatusCode.Conflict,
            };
        }
        if (!IsValidContributor(dataType, user.GetOrg(), user.GetOrgNumber()))
        {
            return new ProblemDetails
            {
                Title = "Forbidden",
                Detail = "User is not a valid contributor to the data type",
            };
        }
        return null;
    }

    /// <summary>
    /// Checks if the user has access to create a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    internal static ProblemDetails? GetCreateProblem(
        Instance instance,
        DataType dataType,
        ClaimsPrincipal user,
        long? contentLength = null
    )
    {
        // Run the general mutation checks
        if (GetMutationProblem(instance, dataType, user) is { } problemDetails)
        {
            return problemDetails;
        }

        // Verify that we don't exceed the max count for data type on the instance
        int existingElements = instance.Data.Count(d => d.DataType == dataType.Id);
        if (dataType.MaxCount > 0 && existingElements >= dataType.MaxCount)
        {
            return new ProblemDetails()
            {
                Title = "Max Count Exceeded",
                Detail = $"Cannot create more than {dataType.MaxCount} data elements of type {dataType.Id}",
                Status = (int)HttpStatusCode.Conflict,
            };
        }

        // Verify that we don't exceed the max size
        if (contentLength.HasValue && dataType.MaxSize > 0 && contentLength > dataType.MaxSize)
        {
            return new ProblemDetails()
            {
                Title = "Max Size Exceeded",
                Detail =
                    $"Cannot create data element of size {contentLength} which exceeds the max size of {dataType.MaxSize}",
                Status = (int)HttpStatusCode.BadRequest,
            };
        }

        // Verify that only orgs can create data elements when DisallowUserCreate is true
        if (dataType.AppLogic?.DisallowUserCreate == true && string.IsNullOrWhiteSpace(user.GetOrg()))
        {
            return new ProblemDetails()
            {
                Title = "User Create Disallowed",
                Detail = $"Cannot create data element of type {dataType.Id} as it is disallowed by app logic",
                Status = (int)HttpStatusCode.BadRequest,
            };
        }

        return null;
    }

    /// <summary>
    /// Checks if the user has access to mutate a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    internal static ProblemDetails? GetUpdateProblem(Instance instance, DataType dataType, ClaimsPrincipal user)
    {
        if (GetMutationProblem(instance, dataType, user) is { } problemDetails)
        {
            return problemDetails;
        }

        return null;
    }

    /// <summary>
    /// Checks if the user has access to delete a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    internal static ProblemDetails? GetDeleteProblem(
        Instance instance,
        DataType dataType,
        Guid dataElementId,
        ClaimsPrincipal user
    )
    {
        if (GetMutationProblem(instance, dataType, user) is { } problemDetails)
        {
            return problemDetails;
        }

        // Kept for compatibility with old app logic
        // Not sure why this restriction is required, but keeping for now
        if (dataType is { AppLogic.ClassRef: not null, MaxCount: 1, MinCount: 1 })
        {
            return new ProblemDetails()
            {
                Title = "Cannot Delete main data element",
                Detail = "Cannot delete the only data element of a class with app logic",
                Status = (int)HttpStatusCode.BadRequest,
            };
        }

        if (dataType.AppLogic?.DisallowUserDelete == true && !UserHasValidOrgClaim(user))
        {
            return new ProblemDetails()
            {
                Title = "User Delete Disallowed",
                Detail = $"Cannot delete data element of type {dataType.Id} as it is disallowed by app logic",
                Status = (int)HttpStatusCode.BadRequest,
            };
        }

        return null;
    }

    private static bool InstanceIsActive(Instance i)
    {
        return i?.Status?.Archived is null && i?.Status?.SoftDeleted is null && i?.Status?.HardDeleted is null;
    }

    /// <summary>
    /// Checks if the current claims principal has a valid `urn:altinn:org` claim
    /// </summary>
    private static bool UserHasValidOrgClaim(ClaimsPrincipal user) => !string.IsNullOrWhiteSpace(user.GetOrg());
}
