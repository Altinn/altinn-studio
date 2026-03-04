using WorkflowEngine.Api.Utils;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api;

internal interface IEngine
{
    Task<WorkflowEnqueueResponse> EnqueueWorkflow(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    );
}

internal sealed class Engine(WorkflowWriteBuffer _writeBuffer) : IEngine
{
    public async Task<WorkflowEnqueueResponse> EnqueueWorkflow(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.EnqueueWorkflow",
            tags:
            [
                ("request.actor.id", request.Actor.UserIdOrOrgNumber),
                ("request.workflows.count", request.Workflows.Count),
                ("request.instance.guid", metadata.InstanceInformation.InstanceGuid),
                ("request.instance.party.id", metadata.InstanceInformation.InstanceOwnerPartyId),
                ("request.instance.app", $"{metadata.InstanceInformation.Org}/{metadata.InstanceInformation.App}"),
            ]
        );

        IReadOnlyList<WorkflowRequest> sortedRequests;
        try
        {
            sortedRequests = ValidationUtils.ValidateAndSortWorkflowGraph(request.Workflows);
        }
        catch (ArgumentException ex)
        {
            activity?.Errored(ex);
            return WorkflowEnqueueResponse.Reject(
                WorkflowEnqueueResponse.Rejection.Invalid,
                $"Invalid request. Workflow graph did not validate: {ex.Message}"
            );
        }

        var hash = request.ComputeHash();

        try
        {
            var workflowIds = await _writeBuffer.EnqueueAsync(request, metadata, hash, cancellationToken);

            var results = sortedRequests
                .Zip(
                    workflowIds,
                    (req, id) => new WorkflowEnqueueResponse.WorkflowResult { Ref = req.Ref, DatabaseId = id }
                )
                .ToList();

            return WorkflowEnqueueResponse.Accept(results);
        }
        catch (IdempotencyConflictException)
        {
            return WorkflowEnqueueResponse.Reject(
                WorkflowEnqueueResponse.Rejection.Duplicate,
                $"Idempotency conflict: the key '{request.IdempotencyKey}' was already used with a different request body."
            );
        }
        catch (InvalidWorkflowReferenceException ex)
        {
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid, ex.Message);
        }
    }
}
