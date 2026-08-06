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

        ProblemDetails? problemDetails = context.Result switch
        {
            ObjectResult { Value: ProblemDetails problem } => problem,
            JsonResult { Value: ProblemDetails problem } => problem,
            _ => null,
        };
        if (problemDetails is not null)
            activity.SetProblemDetails(problemDetails);
    }

    public void OnResultExecuting(ResultExecutingContext context) { }
}
