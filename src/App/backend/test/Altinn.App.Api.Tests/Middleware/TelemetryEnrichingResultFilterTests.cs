using System.Diagnostics;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Infrastructure.Middleware;
using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;
using Moq;

namespace Altinn.App.Api.Tests.Middleware;

public sealed class TelemetryEnrichingResultFilterTests
{
    [Fact]
    public void OnResultExecuted_EnrichesActivityForProcessStatusJsonProblem()
    {
        using Activity activity = new("test");
        activity.Start();
        var activityFeature = new Mock<IHttpActivityFeature>(MockBehavior.Strict);
        activityFeature.SetupGet(feature => feature.Activity).Returns(activity);
        var httpContext = new DefaultHttpContext();
        httpContext.Features.Set(activityFeature.Object);
        var actionContext = new ActionContext(
            httpContext,
            new RouteData(),
            new ActionDescriptor(),
            new Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary()
        );
        JsonResult result = ProcessStatusProblemResult.Create(
            ProcessStatusHelper.CreateMutationProblem(ProcessStatus.Processing)
        );
        var executedContext = new ResultExecutedContext(actionContext, [], result, new object());

        new TelemetryEnrichingResultFilter().OnResultExecuted(executedContext);

        activity.GetTagItem("problem.type").Should().Be("instance-processing");
        activity.GetTagItem("problem.title").Should().Be("Instance mutation blocked.");
        activity.GetTagItem("problem.status").Should().Be(StatusCodes.Status409Conflict);
    }
}
