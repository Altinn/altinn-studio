using Altinn.App.Core.Features;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.App.Api.Infrastructure.Middleware;

internal sealed class TelemetryEnrichingResultFilter : IResultFilter
{
    public void OnResultExecuted(ResultExecutedContext context)
    {
        var activity = context.HttpContext.Features.Get<IHttpActivityFeature>()?.Activity;
        if (activity is null)
            return;

        if (context.Result is ObjectResult result && result.Value is ProblemDetails problemDetails)
            activity.SetProblemDetails(problemDetails);
    }

    public void OnResultExecuting(ResultExecutingContext context) { }
}
