using System.Data.Common;
using System.Diagnostics;
using Altinn.Studio.Runtime.Common;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Npgsql;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;

namespace WorkflowEngine.Api.Endpoints;

internal static class ReplyEndpoints
{
    public static WebApplication MapReplyEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/workflow/{org}/{app}/reply").RequireApiKeyAuthorization().WithTags("Reply");

        group
            .MapPost("/{correlationId:guid}", ReplyRequestHandlers.SubmitReply)
            .WithName("SubmitReply")
            .WithDescription("Submits a reply for a suspended workflow step using the correlation ID");

        return app;
    }
}

internal static class ReplyRequestHandlers
{
    public static async Task<Results<Ok, NotFound, ProblemHttpResult>> SubmitReply(
        [FromRoute] Guid correlationId,
        [FromBody] ReplyRequest request,
        [FromServices] WorkflowReplies workflowReplies,
        CancellationToken cancellationToken
    )
    {
        var result = await workflowReplies.ReceiveReply(request, correlationId, cancellationToken);

        return result switch
        {
            ReplyResponse.Exists or ReplyResponse.Received => TypedResults.Ok(),
            ReplyResponse.Mismatch => TypedResults.Problem(
                detail: "Reply with different payload already received for the step.",
                statusCode: StatusCodes.Status400BadRequest
            ),
            ReplyResponse.WorkflowNotFound or ReplyResponse.StepNotFound => TypedResults.Problem(
                statusCode: StatusCodes.Status404NotFound
            ),
            ReplyResponse.StepNotReplyAppCommand => TypedResults.Problem(
                detail: $"No ReplyAppCommand step found for correlation ID {correlationId}",
                statusCode: StatusCodes.Status400BadRequest
            ),
            _ => throw new UnreachableException(),
        };
    }
}
