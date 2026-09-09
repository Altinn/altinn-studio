using Altinn.App.Core.Internal.Data;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

internal static class InstanceStateConflictResult
{
    public static ProblemDetails Create(InstanceStateConflictException exception) =>
        exception switch
        {
            ProcessStateStaleException processStateStale => new ProblemDetails
            {
                Title = "Process state has changed",
                Detail =
                    $"Expected process-state version {processStateStale.ExpectedVersion}, but the current version is {processStateStale.ActualVersion}.",
                Status = StatusCodes.Status412PreconditionFailed,
                Extensions =
                {
                    ["expectedVersion"] = processStateStale.ExpectedVersion,
                    ["actualVersion"] = processStateStale.ActualVersion,
                },
            },
            DataElementContentConflictException contentConflict => new ProblemDetails
            {
                Title = "Data element content conflict",
                Detail =
                    $"Data element {contentConflict.DataElementId} for instance {contentConflict.InstanceId} changed after the instance was loaded. Reload the instance data and retry the request.",
                Status = StatusCodes.Status409Conflict,
            },
            InstanceDataStaleException => new ProblemDetails
            {
                Title = "Instance data conflict",
                Detail = "Instance data changed since it was loaded. Reload the instance data and retry the request.",
                Status = StatusCodes.Status409Conflict,
            },
            _ => new ProblemDetails
            {
                Title = "Instance data conflict",
                Detail = "Instance data changed since it was loaded. Reload the instance data and retry the request.",
                Status = StatusCodes.Status409Conflict,
            },
        };
}
