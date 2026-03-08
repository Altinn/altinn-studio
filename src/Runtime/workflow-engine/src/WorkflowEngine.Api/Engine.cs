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

internal sealed class Engine(WorkflowWriteBuffer writeBuffer, ICommandHandlerRegistry registry) : IEngine
{
    public async Task<WorkflowEnqueueResponse> EnqueueWorkflow(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.EnqueueWorkflow",
            tags: [("request.tenant.id", request.TenantId), ("request.workflows.count", request.Workflows.Count)]
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

        // Validate command types and handler-specific data before persistence
        var commandError = ValidateCommands(request);
        if (commandError is not null)
        {
            activity?.Errored(errorMessage: commandError);
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid, commandError);
        }

        try
        {
            var hash = request.ComputeHash();
            var workflowIds = await writeBuffer.EnqueueAsync(request, metadata, hash, cancellationToken);
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
            activity?.Errored(errorMessage: $"Idempotency conflict for key '{request.IdempotencyKey}'");
            return WorkflowEnqueueResponse.Reject(
                WorkflowEnqueueResponse.Rejection.Duplicate,
                $"Idempotency conflict: the key '{request.IdempotencyKey}' was already used with a different request body."
            );
        }
        catch (InvalidWorkflowReferenceException ex)
        {
            activity?.Errored(ex);
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid, ex.Message);
        }
    }

    /// <summary>
    /// Validates that all command types in the request are known to the registry
    /// and that handler-specific validation passes.
    /// </summary>
    private string? ValidateCommands(WorkflowEnqueueRequest request)
    {
        for (int workflowIndex = 0; workflowIndex < request.Workflows.Count; workflowIndex++)
        {
            var workflow = request.Workflows[workflowIndex];
            for (int stepIndex = 0; stepIndex < workflow.Steps.Count; stepIndex++)
            {
                var step = workflow.Steps[stepIndex];
                var commandType = step.Command.Type;

                if (!registry.HasHandler(commandType))
                {
                    return $"Unknown command type '{commandType}' in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                        + $"step #{stepIndex}. Registered types: {string.Join(", ", registry.GetAllHandlers().Select(h => h.CommandType))}";
                }

                var handler = registry.GetHandler(commandType);
                var validationError = handler.Validate(step.Command.Data, request.Context);
                if (validationError is not null)
                {
                    return $"Validation failed for '{commandType}' command in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                        + $"step #{stepIndex}: {validationError}";
                }
            }
        }

        return null;
    }
}
