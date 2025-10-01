using Altinn.App.Core.Features.Auth;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Internal.Data;

internal interface IDataElementAccessChecker
{
    /// <summary>
    /// Checks if the user has access to read a data element of a given data type on an instance.
    /// </summary>
    /// <remarks>The current request <see cref="HttpContext.User"/> is used to determine read access</remarks>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    Task<ProblemDetails?> GetReaderProblem(Instance instance, DataType dataType);

    /// <summary>
    /// Checks if the user has access to read a given data element on an instance.
    /// </summary>
    /// <remarks>The current request <see cref="HttpContext.User"/> is used to determine read access</remarks>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    Task<ProblemDetails?> GetReaderProblem(Instance instance, DataElement dataElement);

    /// <summary>
    /// Convenience alias for <see cref="GetReaderProblem(Instance,DataType)"/>.
    /// Determines if the current request user can read the given data type
    /// </summary>
    Task<bool> CanRead(Instance instance, DataType dataType);

    /// <summary>
    /// Convenience alias for <see cref="GetCreateProblem"/>.
    /// Determines if the current request user can create the given data type
    /// </summary>
    Task<bool> CanCreate(Instance instance, DataType dataType, Authenticated? auth = null, long? contentLength = null);

    /// <summary>
    /// Convenience alias for <see cref="GetUpdateProblem"/>.
    /// Determines if the current request user can update/write the given data type
    /// </summary>
    Task<bool> CanUpdate(Instance instance, DataType dataType, Authenticated? auth = null);

    /// <summary>
    /// Convenience alias for <see cref="GetDeleteProblem"/>.
    /// Determines if the current request user can delete the given data element and type
    /// </summary>
    Task<bool> CanDelete(Instance instance, DataType dataType, Guid dataElementId, Authenticated? auth = null);

    /// <summary>
    /// Checks if the user has access to create a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    Task<ProblemDetails?> GetCreateProblem(
        Instance instance,
        DataType dataType,
        Authenticated? auth = null,
        long? contentLength = null
    );

    /// <summary>
    /// Checks if the user has access to mutate a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    Task<ProblemDetails?> GetUpdateProblem(Instance instance, DataType dataType, Authenticated? auth = null);

    /// <summary>
    /// Checks if the user has access to delete a data element of a given data type on an instance.
    /// </summary>
    /// <returns>null for success or ProblemDetails that can be an error response in the Apis</returns>
    Task<ProblemDetails?> GetDeleteProblem(
        Instance instance,
        DataType dataType,
        Guid dataElementId,
        Authenticated? auth = null
    );
}
