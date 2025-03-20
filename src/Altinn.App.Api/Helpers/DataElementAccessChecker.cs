using Altinn.App.Core.Features.Auth;
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
    internal static bool IsValidContributor(DataType dataType, Authenticated auth)
    {
        if (dataType.AllowedContributers is null || dataType.AllowedContributers.Count == 0)
        {
            return true;
        }

        var (org, orgNr) = auth switch
        {
            // System users also have 'orgno',  but this feature was originally intended
            // to let a service owner "own" a specific data type, so we haven't extended this
            Authenticated.ServiceOwner a => (a.Name, a.OrgNo),
            _ => (null, null),
        };

        foreach (string item in dataType.AllowedContributers)
        {
            var splitIndex = item.IndexOf(':');
            ReadOnlySpan<char> key = item.AsSpan(0, splitIndex);
            ReadOnlySpan<char> value = item.AsSpan(splitIndex + 1);

            if (key.Equals("org", StringComparison.OrdinalIgnoreCase))
            {
                if (org is null)
                    continue;

                if (value.Equals(org, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
            else if (key.Equals("orgno", StringComparison.OrdinalIgnoreCase))
            {
                if (orgNr is null)
                    continue;

                if (value.Equals(orgNr, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        return false;
    }

    /// <summary>
    /// Checks if the user has access to read a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    internal static ProblemDetails? GetReaderProblem(Instance instance, DataType dataType, Authenticated auth)
    {
        // We don't have any way to restrict reads based on data type yet, so just return null.
        // Might be used if we get a concept of internal server only data types or similar.
        return null;
    }

    // Common checks for create, update and delete
    private static ProblemDetails? GetMutationProblem(Instance instance, DataType dataType, Authenticated auth)
    {
        if (GetReaderProblem(instance, dataType, auth) is { } readProblem)
        {
            return readProblem;
        }
        if (!InstanceIsActive(instance))
        {
            return new ProblemDetails()
            {
                Title = "Instance Not Active",
                Detail = $"Cannot update data element of archived or deleted instance {instance.Id}",
                Status = StatusCodes.Status409Conflict,
            };
        }
        if (!IsValidContributor(dataType, auth))
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
        Authenticated auth,
        long? contentLength = null
    )
    {
        // Run the general mutation checks
        if (GetMutationProblem(instance, dataType, auth) is { } problemDetails)
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
                Status = StatusCodes.Status409Conflict,
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
                Status = StatusCodes.Status400BadRequest,
            };
        }

        // Verify that only orgs can create data elements when DisallowUserCreate is true
        if (dataType.AppLogic?.DisallowUserCreate == true && auth is not Authenticated.ServiceOwner)
        {
            return new ProblemDetails()
            {
                Title = "User Create Disallowed",
                Detail = $"Cannot create data element of type {dataType.Id} as it is disallowed by app logic",
                Status = StatusCodes.Status400BadRequest,
            };
        }

        return null;
    }

    /// <summary>
    /// Checks if the user has access to mutate a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    internal static ProblemDetails? GetUpdateProblem(Instance instance, DataType dataType, Authenticated auth)
    {
        if (GetMutationProblem(instance, dataType, auth) is { } problemDetails)
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
        Authenticated auth
    )
    {
        if (GetMutationProblem(instance, dataType, auth) is { } problemDetails)
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
                Status = StatusCodes.Status400BadRequest,
            };
        }

        if (dataType.AppLogic?.DisallowUserDelete == true && auth is not Authenticated.ServiceOwner)
        {
            return new ProblemDetails()
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
}
