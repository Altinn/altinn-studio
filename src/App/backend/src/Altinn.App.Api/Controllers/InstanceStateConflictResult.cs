using Altinn.App.Core.Internal.Data;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

internal static class InstanceStateConflictResult
{
    public static ProblemDetails Create(InstanceStateConflictException exception) =>
        exception switch
        {
            DataElementContentConflictException contentConflict => new ProblemDetails
            {
                Title = "Data element content conflict",
                Detail =
                    $"Data element {contentConflict.DataElementId} for instance {contentConflict.InstanceId} changed after the instance was loaded. Reload the instance data and retry the request.",
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
