using System.Diagnostics;
using System.Text.Json;
using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Utils;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

internal interface IEngine
{
    Task<WorkflowEnqueueResponse> EnqueueWorkflow(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    );
}

internal sealed class Engine(
    WorkflowWriteBuffer writeBuffer,
    ICommandRegistry registry,
    IOptions<EngineSettings> engineSettings
) : IEngine
{
    private readonly EngineSettings _settings = engineSettings.Value;

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
                ("request.namespace", WorkflowNamespace.Normalize(request.Namespace)),
                ("request.workflows.count", request.Workflows.Count),
            ]
        );

        // Validate input size limits before expensive graph validation or command deserialization
        var sizeResult = ValidateInputSizeLimits(request);
        if (sizeResult is SizeLimitValidationResult.Invalid sizeError)
        {
            activity?.Errored(errorMessage: sizeError.Message);
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid, sizeError.Message);
        }

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

        // Validate command types and command-specific data before persistence
        var validationResult = ValidateCommands(request);
        if (validationResult is CommandValidationResult.Invalid error)
        {
            activity?.Errored(errorMessage: error.Message);
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid, error.Message);
        }

        try
        {
            var hash = request.ComputeHash();
            var outcome = await writeBuffer.EnqueueAsync(request, metadata, hash, cancellationToken);
            var results = sortedRequests
                .Zip(
                    outcome.WorkflowIds,
                    (req, id) =>
                        new WorkflowEnqueueResponse.WorkflowResult
                        {
                            Ref = req.Ref,
                            DatabaseId = id,
                            Namespace = WorkflowNamespace.Normalize(request.Namespace),
                        }
                )
                .ToList();

            return outcome.Status switch
            {
                BatchEnqueueResultStatus.Created => WorkflowEnqueueResponse.Created(results),
                BatchEnqueueResultStatus.Duplicate => WorkflowEnqueueResponse.Existing(results),
                _ => throw new UnreachableException(),
            };
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
        catch (EngineAtCapacityException ex)
        {
            activity?.Errored(ex);
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.AtCapacity, ex.Message);
        }
    }

    /// <summary>
    /// Validates that all command types in the request are known to the registry
    /// and that command-specific validation passes (including typed deserialization).
    /// </summary>
    private CommandValidationResult ValidateCommands(WorkflowEnqueueRequest request)
    {
        for (int workflowIndex = 0; workflowIndex < request.Workflows.Count; workflowIndex++)
        {
            var workflow = request.Workflows[workflowIndex];
            for (int stepIndex = 0; stepIndex < workflow.Steps.Count; stepIndex++)
            {
                var step = workflow.Steps[stepIndex];
                var commandType = step.Command.Type;

                if (!registry.HasCommand(commandType))
                {
                    return CommandValidationResult.Reject(
                        $"Unknown command type '{commandType}' in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                            + $"step #{stepIndex}."
                    );
                }

                var command = registry.GetCommand(commandType);

                // Deserialize command data and workflow context using command's declared types
                object? typedCommandData = null;
                if (command.CommandDataType is not null)
                {
                    if (step.Command.Data is not { } rawData)
                    {
                        return CommandValidationResult.Reject(
                            $"Command '{commandType}' in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                                + $"step #{stepIndex} requires command data of type {command.CommandDataType.Name}, but none was provided"
                        );
                    }

                    try
                    {
                        typedCommandData = rawData.Deserialize(
                            command.CommandDataType,
                            CommandDefinition.SerializerOptions
                        );
                    }
                    catch (JsonException ex)
                    {
                        return CommandValidationResult.Reject(
                            $"Failed to deserialize command data for '{commandType}' in workflow "
                                + $"'{workflow.Ref ?? $"#{workflowIndex}"}' step #{stepIndex}: {ex.Message}"
                        );
                    }
                }

                object? typedWorkflowContext = null;
                if (command.WorkflowContextType is not null)
                {
                    if (request.Context is not { } rawContext)
                    {
                        return CommandValidationResult.Reject(
                            $"Command '{commandType}' in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                                + $"step #{stepIndex} requires workflow context of type {command.WorkflowContextType.Name}, but none was provided"
                        );
                    }

                    try
                    {
                        typedWorkflowContext = rawContext.Deserialize(
                            command.WorkflowContextType,
                            CommandDefinition.SerializerOptions
                        );
                    }
                    catch (JsonException ex)
                    {
                        return CommandValidationResult.Reject(
                            $"Failed to deserialize workflow context for '{commandType}' in workflow "
                                + $"'{workflow.Ref ?? $"#{workflowIndex}"}' step #{stepIndex}: {ex.Message}"
                        );
                    }
                }

                var validationResult = command.Validate(typedCommandData, typedWorkflowContext);
                if (validationResult is CommandValidationResult.Invalid error)
                {
                    return CommandValidationResult.Reject(
                        $"Validation failed for '{commandType}' command in workflow '{workflow.Ref ?? $"#{workflowIndex}"}' "
                            + $"step #{stepIndex}: {error.Message}"
                    );
                }
            }
        }

        return CommandValidationResult.Accept();
    }

    /// <summary>
    /// Validates that the request does not exceed input size limits.
    /// </summary>
    private SizeLimitValidationResult ValidateInputSizeLimits(WorkflowEnqueueRequest request)
    {
        if (request.Workflows.Count > _settings.MaxWorkflowsPerRequest)
            return SizeLimitValidationResult.Reject(
                $"Request contains {request.Workflows.Count} workflows, maximum is {_settings.MaxWorkflowsPerRequest}."
            );

        if (request.Labels is not null && request.Labels.Count > _settings.MaxLabels)
            return SizeLimitValidationResult.Reject(
                $"Request contains {request.Labels.Count} labels, maximum is {_settings.MaxLabels}."
            );

        for (int i = 0; i < request.Workflows.Count; i++)
        {
            var workflow = request.Workflows[i];
            if (workflow.Steps.Count > _settings.MaxStepsPerWorkflow)
                return SizeLimitValidationResult.Reject(
                    $"Workflow '{workflow.Ref ?? $"#{i}"}' contains {workflow.Steps.Count} steps, maximum is {_settings.MaxStepsPerWorkflow}."
                );
        }

        return SizeLimitValidationResult.Accept();
    }
}
