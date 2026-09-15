using Altinn.App.Api.Controllers;
using Altinn.App.Core.Internal.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.App.Api.Infrastructure.Filters;

internal sealed class InstanceStateConflictExceptionFilter : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is not InstanceStateConflictException exception)
        {
            return;
        }

        ProblemDetails problemDetails = InstanceStateConflictResult.Create(exception);
        context.Result = problemDetails.Status switch
        {
            StatusCodes.Status409Conflict => new ConflictObjectResult(problemDetails),
            StatusCodes.Status412PreconditionFailed => new ObjectResult(problemDetails)
            {
                StatusCode = StatusCodes.Status412PreconditionFailed,
            },
            _ => throw new InvalidOperationException(
                $"Unsupported status code {problemDetails.Status} for {nameof(InstanceStateConflictException)}."
            ),
        };
        context.ExceptionHandled = true;
    }
}
