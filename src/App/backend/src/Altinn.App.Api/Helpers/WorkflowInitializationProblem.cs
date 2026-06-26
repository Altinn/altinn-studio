using System.Net;
using Altinn.App.Api.Models;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Helpers;

/// <summary>
/// Identifies which runtime flow produced a workflow-initialization failure, so that the
/// generated problem details (title and detail text) match the caller's context. Both flows
/// emit the same <see cref="WorkflowInitializationProblemDetails"/> contract.
/// </summary>
internal enum WorkflowInitializationFlow
{
    /// <summary>
    /// A new instance is being created (instantiation or copy).
    /// </summary>
    Instantiation,

    /// <summary>
    /// The process is being started for an already existing instance.
    /// </summary>
    ProcessStart,
}

/// <summary>
/// Builds the <see cref="WorkflowInitializationProblemDetails"/> response returned when the workflow
/// engine rejects or fails the initial process workflow. Shared by instance creation
/// (<see cref="WorkflowInitializationFlow.Instantiation"/>) and process start for existing instances
/// (<see cref="WorkflowInitializationFlow.ProcessStart"/>) so both endpoints expose the same contract.
/// </summary>
internal static class WorkflowInitializationProblem
{
    public static ObjectResult Create(
        ILogger logger,
        WorkflowInitializationFlow flow,
        Exception exception,
        string message,
        WorkflowInitializationState state,
        Instance? instance,
        WorkflowRecommendedAction recommendedAction,
        bool? instanceDeleted = null,
        WorkflowResumeEndpoint? resumeEndpoint = null,
        WorkflowFailure? workflowFailure = null,
        bool? workflowAccepted = null,
        WorkflowSubmissionFailureKind? submissionFailureKind = null,
        HttpStatusCode? submissionStatusCode = null,
        string? collectionKey = null,
        bool processStateChanged = false
    )
    {
        const int statusCode = StatusCodes.Status500InternalServerError;

        logger.LogError(exception, message);

        InstanceIdentifier? identifier = instance?.Id is null ? null : new InstanceIdentifier(instance);

        var problem = new WorkflowInitializationProblemDetails
        {
            Title =
                flow == WorkflowInitializationFlow.ProcessStart
                    ? "Process start failed."
                    : "Instance initialization failed.",
            Status = statusCode,
            Detail = CreateDetail(
                flow,
                state,
                recommendedAction,
                instanceDeleted,
                workflowAccepted,
                processStateChanged
            ),
            InitializationState = state,
            RecommendedAction = recommendedAction,
            InstanceDeleted = instanceDeleted,
            ResumeEndpoint = resumeEndpoint,
            WorkflowAccepted = workflowAccepted,
            WorkflowFailure = workflowFailure,
            WorkflowSubmissionFailureKind = submissionFailureKind,
            WorkflowSubmissionStatusCode = submissionStatusCode is null ? null : (int)submissionStatusCode.Value,
            WorkflowCollectionKey = string.IsNullOrWhiteSpace(collectionKey) ? null : collectionKey,
            // Only meaningful (and only emitted) when the process may actually have advanced.
            ProcessStateChanged = processStateChanged ? true : null,
            InstanceId = instance?.Id,
            InstanceOwnerPartyId = identifier?.InstanceOwnerPartyId,
            InstanceGuid = identifier?.InstanceGuid,
        };

        return new ObjectResult(problem) { StatusCode = statusCode };
    }

    public static WorkflowResumeEndpoint CreateProcessResumeEndpoint(string org, string app, Instance instance)
    {
        var identifier = new InstanceIdentifier(instance);
        return new WorkflowResumeEndpoint(
            "POST",
            $"/{org}/{app}/instances/{identifier.InstanceOwnerPartyId}/{identifier.InstanceGuid}/process/resume"
        );
    }

    private static string CreateDetail(
        WorkflowInitializationFlow flow,
        WorkflowInitializationState state,
        WorkflowRecommendedAction recommendedAction,
        bool? instanceDeleted,
        bool? workflowAccepted,
        bool processStateChanged
    ) =>
        flow == WorkflowInitializationFlow.ProcessStart
            ? CreateProcessStartDetail(state, workflowAccepted, processStateChanged)
            : CreateInstantiationDetail(
                state,
                recommendedAction,
                instanceDeleted,
                workflowAccepted,
                processStateChanged
            );

    private static string CreateInstantiationDetail(
        WorkflowInitializationState state,
        WorkflowRecommendedAction recommendedAction,
        bool? instanceDeleted,
        bool? workflowAccepted,
        bool processStateChanged
    ) =>
        (state, recommendedAction, instanceDeleted, workflowAccepted, processStateChanged) switch
        {
            (
                WorkflowInitializationState.WorkflowNotAccepted,
                WorkflowRecommendedAction.RetryInstanceCreation,
                true,
                _,
                _
            ) =>
                "Runtime created the instance, but the initial workflow was not accepted by the workflow engine. The created instance was deleted, so the client can safely retry instance creation.",
            (WorkflowInitializationState.WorkflowNotAccepted, _, false, _, _) =>
                "Runtime created the instance, but the initial workflow was not accepted by the workflow engine. Runtime could not delete the created instance, so inspect the instance before retrying instance creation.",
            (WorkflowInitializationState.WorkflowAcceptanceUnknown, _, _, _, _) =>
                "Runtime submitted the initial workflow, but could not determine whether the workflow engine accepted it. Inspect the instance and workflow state before retrying instance creation.",
            (WorkflowInitializationState.WorkflowFailed, _, _, true, true) =>
                "The workflow engine accepted the initial workflow, but the workflow failed after process state may have been updated in Storage. Do not create a duplicate instance; resolve the workflow failure and call the resume endpoint.",
            (WorkflowInitializationState.WorkflowFailed, _, _, true, _) =>
                "The workflow engine accepted the initial workflow, but the workflow failed before instance initialization completed. Do not create a duplicate instance; resolve the workflow failure and call the resume endpoint.",
            _ => "Runtime could not complete instance initialization. Inspect the response details before retrying.",
        };

    private static string CreateProcessStartDetail(
        WorkflowInitializationState state,
        bool? workflowAccepted,
        bool processStateChanged
    ) =>
        (state, workflowAccepted, processStateChanged) switch
        {
            (WorkflowInitializationState.WorkflowNotAccepted, _, _) =>
                "The workflow engine did not accept the process start. The existing instance was not modified, so the client can retry starting the process.",
            (WorkflowInitializationState.WorkflowAcceptanceUnknown, _, _) =>
                "Runtime submitted the process start workflow, but could not determine whether the workflow engine accepted it. Inspect the instance and workflow state before retrying.",
            (WorkflowInitializationState.WorkflowFailed, true, true) =>
                "The workflow engine accepted the process start, but the workflow failed after process state may have been updated in Storage. Do not start the process again; resolve the workflow failure and call the resume endpoint.",
            (WorkflowInitializationState.WorkflowFailed, true, _) =>
                "The workflow engine accepted the process start, but the workflow failed before the process finished starting. Do not start the process again; resolve the workflow failure and call the resume endpoint.",
            _ => "Runtime could not start the process. Inspect the response details before retrying.",
        };
}
