using Altinn.App.Core.Internal.Data;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

internal static class DataElementContentConflictResult
{
    public static ProblemDetails Create(DataElementContentConflictException exception) =>
        new()
        {
            Title = "Data element content conflict",
            Detail =
                $"Data element {exception.DataElementId} for instance {exception.InstanceId} changed after the instance was loaded. Reload the instance data and retry the request.",
            Status = StatusCodes.Status409Conflict,
        };
}
