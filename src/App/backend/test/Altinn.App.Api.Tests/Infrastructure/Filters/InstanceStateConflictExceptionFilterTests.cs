using Altinn.App.Api.Controllers;
using Altinn.App.Api.Infrastructure.Filters;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;

namespace Altinn.App.Api.Tests.Infrastructure.Filters;

public class InstanceStateConflictExceptionFilterTests
{
    [Fact]
    public void OnException_WithDataElementConflict_ReturnsElementSpecificProblemDetails()
    {
        Guid dataElementId = Guid.NewGuid();
        var exception = new DataElementContentConflictException(
            "123/instance-id",
            dataElementId,
            new InvalidOperationException("stale")
        );
        ExceptionContext context = CreateContext(exception);

        new InstanceStateConflictExceptionFilter().OnException(context);

        Assert.True(context.ExceptionHandled);
        var conflict = Assert.IsType<ConflictObjectResult>(context.Result);
        var problemDetails = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problemDetails.Status);
        Assert.Equal("Data element content conflict", problemDetails.Title);
        Assert.Contains(dataElementId.ToString(), problemDetails.Detail, StringComparison.Ordinal);
        Assert.Contains(
            "Reload the instance data and retry the request.",
            problemDetails.Detail,
            StringComparison.Ordinal
        );
    }

    [Fact]
    public void OnException_WithGenericInstanceStateConflict_ReturnsReloadProblemDetails()
    {
        ExceptionContext context = CreateContext(new TestInstanceStateConflictException());

        new InstanceStateConflictExceptionFilter().OnException(context);

        Assert.True(context.ExceptionHandled);
        var conflict = Assert.IsType<ConflictObjectResult>(context.Result);
        var problemDetails = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problemDetails.Status);
        Assert.Equal("Instance data conflict", problemDetails.Title);
        Assert.Equal(
            "Instance data changed since it was loaded. Reload the instance data and retry the request.",
            problemDetails.Detail
        );
    }

    [Fact]
    public void OnException_WithInstanceDataStaleConflict_ReturnsConflictProblemDetails()
    {
        ExceptionContext context = CreateContext(
            new InstanceDataStaleException(
                new PlatformHttpException(
                    new HttpResponseMessage(System.Net.HttpStatusCode.PreconditionFailed),
                    "storage precondition failed"
                )
            )
        );

        new InstanceStateConflictExceptionFilter().OnException(context);

        Assert.True(context.ExceptionHandled);
        var conflict = Assert.IsType<ConflictObjectResult>(context.Result);
        var problemDetails = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal(StatusCodes.Status409Conflict, problemDetails.Status);
        Assert.Equal("Instance data conflict", problemDetails.Title);
    }

    [Fact]
    public void OnException_WithStaleProcessState_ReturnsPreconditionFailedProblemDetails()
    {
        ExceptionContext context = CreateContext(new ProcessStateStaleException(expectedVersion: 7, actualVersion: 9));

        new InstanceStateConflictExceptionFilter().OnException(context);

        Assert.True(context.ExceptionHandled);
        var result = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status412PreconditionFailed, result.StatusCode);
        var problemDetails = Assert.IsType<ProblemDetails>(result.Value);
        Assert.Equal(StatusCodes.Status412PreconditionFailed, problemDetails.Status);
        Assert.Equal("Process state has changed", problemDetails.Title);
        Assert.Contains("7", problemDetails.Detail, StringComparison.Ordinal);
        Assert.Contains("9", problemDetails.Detail, StringComparison.Ordinal);
        Assert.Equal(7, problemDetails.Extensions["expectedVersion"]);
        Assert.Equal(9, problemDetails.Extensions["actualVersion"]);
    }

    [Fact]
    public void OnException_WithUnrelatedException_DoesNotHandleException()
    {
        ExceptionContext context = CreateContext(new InvalidOperationException());

        new InstanceStateConflictExceptionFilter().OnException(context);

        Assert.False(context.ExceptionHandled);
        Assert.Null(context.Result);
    }

    private static ExceptionContext CreateContext(Exception exception) =>
        new(new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor()), [])
        {
            Exception = exception,
        };

    private sealed class TestInstanceStateConflictException()
        : InstanceStateConflictException("Instance data changed after it was loaded.");
}
