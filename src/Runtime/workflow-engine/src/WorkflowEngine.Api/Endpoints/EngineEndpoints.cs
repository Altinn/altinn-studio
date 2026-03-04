using System.Diagnostics;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Utils;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;
using JsonOptions = Microsoft.AspNetCore.Http.Json.JsonOptions;

namespace WorkflowEngine.Api.Endpoints;

internal static class EngineEndpoints
{
    public static WebApplication MapEngineEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/v1/workflows/{org}/{app}/{instanceOwnerPartyId:int}/{instanceGuid:guid}")
            .RequireApiKeyAuthorization()
            .WithTags("Workflows");

        group
            .MapPost("", EngineRequestHandlers.EnqueueWorkflows)
            .WithName("EnqueueWorkflows")
            .WithDescription("Enqueues one or more workflows, resolving their dependency graph");

        group
            .MapGet("", EngineRequestHandlers.ListActiveWorkflows)
            .WithName("ListActiveWorkflows")
            .WithDescription("Lists all active workflows for the given instance");

        group
            .MapGet("/{workflowId:guid}", EngineRequestHandlers.GetWorkflow)
            .WithName("GetWorkflow")
            .WithDescription("Gets details of a single workflow by database ID");

        // TODO: Probably need a historical endpoint for workflows here

        return app;
    }
}

internal static class EngineRequestHandlers
{
    public static async Task<Results<Ok<WorkflowEnqueueResponse.Accepted>, ProblemHttpResult>> EnqueueWorkflows(
        [AsParameters] InstanceRouteParams instanceParams,
        HttpRequest httpRequest,
        [FromServices] WorkflowWriteBuffer writeBuffer,
        [FromServices] TimeProvider timeProvider,
        [FromServices] IOptions<JsonOptions> jsonOptions,
        CancellationToken cancellationToken
    )
    {
        using var ms = new MemoryStream();
        await httpRequest.Body.CopyToAsync(ms, cancellationToken);
        var requestBodyBytes = ms.ToArray();

        WorkflowEnqueueRequest? request;
        try
        {
            request = JsonSerializer.Deserialize<WorkflowEnqueueRequest>(
                requestBodyBytes,
                jsonOptions.Value.SerializerOptions
            );
        }
        catch (JsonException ex)
        {
            return TypedResults.Problem(
                detail: $"Invalid request body: {ex.Message}",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        if (request is null)
        {
            return TypedResults.Problem(
                detail: "Request body is required.",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        Metrics.WorkflowRequestsReceived.Add(request.Workflows.Count, ("endpoint", "enqueue"));

        if (ValidationUtils.HasAppCommandSteps(request.Workflows) && string.IsNullOrWhiteSpace(request.LockToken))
            return TypedResults.Problem(
                detail: "A LockToken is required when any workflow step uses an AppCommand.",
                statusCode: StatusCodes.Status400BadRequest
            );

        IReadOnlyList<WorkflowRequest> sortedRequests;
        try
        {
            sortedRequests = ValidationUtils.ValidateAndSortWorkflowGraph(request.Workflows);
        }
        catch (ArgumentException ex)
        {
            return TypedResults.Problem(
                detail: $"Invalid request. Workflow graph did not validate: {ex.Message}",
                statusCode: StatusCodes.Status400BadRequest
            );
        }

        var metadata = new WorkflowRequestMetadata(
            instanceParams,
            request.Actor,
            timeProvider.GetUtcNow(),
            Activity.Current?.Id,
            request.LockToken
        );

        var bodyHash = SHA256.HashData(requestBodyBytes);

        try
        {
            var workflowIds = await writeBuffer.EnqueueAsync(request, metadata, bodyHash, cancellationToken);

            var results = sortedRequests
                .Zip(
                    workflowIds,
                    (req, id) => new WorkflowEnqueueResponse.WorkflowResult { Ref = req.Ref, DatabaseId = id }
                )
                .ToList();

            return TypedResults.Ok(WorkflowEnqueueResponse.Accept(results));
        }
        catch (IdempotencyConflictException)
        {
            return TypedResults.Problem(
                detail: $"Idempotency conflict: the key '{request.IdempotencyKey}' was already used with a different request body.",
                statusCode: StatusCodes.Status409Conflict
            );
        }
        catch (InvalidWorkflowReferenceException ex)
        {
            return TypedResults.Problem(detail: ex.Message, statusCode: StatusCodes.Status400BadRequest);
        }
    }

    public static async Task<Results<Ok<IEnumerable<WorkflowStatusResponse>>, NoContent>> ListActiveWorkflows(
        [AsParameters] InstanceRouteParams instanceParams,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "list"));

        var workflows = await repository.GetActiveWorkflowsForInstance(instanceParams.InstanceGuid, cancellationToken);

        if (workflows.Count == 0)
            return TypedResults.NoContent();

        return TypedResults.Ok(workflows.Select(WorkflowStatusResponse.FromWorkflow));
    }

    public static async Task<Results<Ok<WorkflowStatusResponse>, NotFound>> GetWorkflow(
        [AsParameters] InstanceRouteParams instanceParams,
        [FromRoute] Guid workflowId,
        [FromServices] IEngineRepository repository,
        CancellationToken cancellationToken
    )
    {
        Metrics.WorkflowQueriesReceived.Add(1, ("endpoint", "get"));

        var workflow = await repository.GetWorkflow(workflowId, cancellationToken);

        if (workflow is null)
            return TypedResults.NotFound();

        // Prevent cross-instance information disclosure
        if (workflow.InstanceInformation.InstanceGuid != instanceParams.InstanceGuid)
            return TypedResults.NotFound();

        return TypedResults.Ok(WorkflowStatusResponse.FromWorkflow(workflow));
    }
}

internal readonly struct InstanceRouteParams
{
    [FromRoute]
    public string Org { get; init; }

    [FromRoute]
    public string App { get; init; }

    [FromRoute]
    public int InstanceOwnerPartyId { get; init; }

    [FromRoute]
    public Guid InstanceGuid { get; init; }

    public static implicit operator InstanceInformation(InstanceRouteParams routeParams) =>
        new()
        {
            Org = routeParams.Org,
            App = routeParams.App,
            InstanceOwnerPartyId = routeParams.InstanceOwnerPartyId,
            InstanceGuid = routeParams.InstanceGuid,
        };
}
