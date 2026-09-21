using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Controllers;

internal static class ProcessStatusProblemResult
{
    public const string ContentType = "application/problem+json";

    public static JsonResult Create(ProblemDetails problem)
    {
        ArgumentNullException.ThrowIfNull(problem);

        return new JsonResult(problem)
        {
            StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError,
            ContentType = ContentType,
        };
    }

    public static JsonResult Create(ProcessStatus currentStatus) =>
        Create(ProcessStatusHelper.CreateMutationProblem(currentStatus));
}
