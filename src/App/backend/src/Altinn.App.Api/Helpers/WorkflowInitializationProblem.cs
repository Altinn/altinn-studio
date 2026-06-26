using System.Net;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Api.Helpers;

/// <summary>
/// Identifies which runtime flow produced a workflow-initialization failure, so that the
/// generated problem details (title, detail text and recommended action) match the caller's
/// context. Both flows share the same structured extensions so clients can react uniformly.
/// </summary>
internal enum WorkflowInitializationFlow
{
    /// <summary>A new instance is being created (instantiation or copy).</summary>
    Instantiation,

    /// <summary>The process is being started for an already existing instance.</summary>
    ProcessStart,
}

/// <summary>
/// Hypermedia pointer to the process resume endpoint, surfaced so clients know where to recover
/// a workflow that failed after the process state may already have changed.
/// </summary>
internal sealed record ResumeEndpoint(string Method, string Path);

/// <summary>
/// Builds the structured problem details returned when the workflow engine rejects or fails an
/// initial process workflow. Shared by instance creation (<see cref="WorkflowInitializationFlow.Instantiation"/>)
/// and process start for existing instances (<see cref="WorkflowInitializationFlow.ProcessStart"/>) so both
/// endpoints expose the same machine-readable recovery contract.
/// </summary>
internal static class WorkflowInitializationProblem
{
    /// <summary>
    /// Stable <c>initializationState</c> values published on the wire. These are part of the external
    /// recovery contract, so they must not change without coordinating with clients. Pinned by tests.
    /// </summary>
    public static class InitializationState
    {
        public const string WorkflowNotAccepted = "workflowNotAccepted";
        public const string WorkflowAcceptanceUnknown = "workflowAcceptanceUnknown";
        public const string WorkflowFailed = "workflowFailed";
    }

    /// <summary>
    /// Stable <c>recommendedAction</c> values published on the wire. These are part of the external
    /// recovery contract, so they must not change without coordinating with clients. Pinned by tests.
    /// </summary>
    public static class RecommendedAction
    {
        public const string RetryInstanceCreation = "retryInstanceCreation";
        public const string RetryStartProcess = "retryStartProcess";
        public const string InspectInstance = "inspectInstance";
        public const string ResumeCurrentTask = "resumeCurrentTask";
    }

    /// <summary>
    /// Stable <c>workflowSubmissionFailureKind</c> values published on the wire. Mapped explicitly from
    /// <see cref="WorkflowSubmissionFailureKind"/> rather than via <c>ToString()</c> so that renaming an enum
    /// member does not silently change the external contract. Pinned by tests.
    /// </summary>
    public static class SubmissionFailureKind
    {
        public const string NotAccepted = "NotAccepted";
        public const string Unknown = "Unknown";
    }

    /// <summary>
    /// Maps a <see cref="WorkflowSubmissionFailureKind"/> to its stable wire value.
    /// </summary>
    public static string ToWireValue(WorkflowSubmissionFailureKind kind) =>
        kind switch
        {
            WorkflowSubmissionFailureKind.NotAccepted => SubmissionFailureKind.NotAccepted,
            WorkflowSubmissionFailureKind.Unknown => SubmissionFailureKind.Unknown,
            _ => throw new ArgumentOutOfRangeException(
                nameof(kind),
                kind,
                "Unhandled workflow submission failure kind."
            ),
        };

    public static ObjectResult Create(
        ILogger logger,
        WorkflowInitializationFlow flow,
        Exception exception,
        string message,
        string initializationState,
        Instance? instance,
        string recommendedAction,
        bool? instanceDeleted = null,
        ResumeEndpoint? resumeEndpoint = null,
        WorkflowFailure? workflowFailure = null,
        bool? workflowAccepted = null,
        string? workflowSubmissionFailureKind = null,
        HttpStatusCode? workflowSubmissionStatusCode = null,
        string? workflowCollectionKey = null,
        bool processStateChanged = false
    )
    {
        const int statusCode = StatusCodes.Status500InternalServerError;

        logger.LogError(exception, message);

        var problemDetails = new ProblemDetails
        {
            Detail = CreateDetail(
                flow,
                initializationState,
                recommendedAction,
                instanceDeleted,
                workflowAccepted,
                processStateChanged
            ),
            Status = statusCode,
            Title =
                flow == WorkflowInitializationFlow.ProcessStart
                    ? "Process start failed."
                    : "Instance initialization failed.",
        };
        problemDetails.Extensions["initializationState"] = initializationState;
        problemDetails.Extensions["recommendedAction"] = recommendedAction;
        problemDetails.Extensions["technicalDetail"] = message;

        if (instanceDeleted.HasValue)
        {
            problemDetails.Extensions["instanceDeleted"] = instanceDeleted.Value;
        }

        if (resumeEndpoint is not null)
        {
            problemDetails.Extensions["resumeEndpoint"] = resumeEndpoint;
        }

        if (workflowAccepted.HasValue)
        {
            problemDetails.Extensions["workflowAccepted"] = workflowAccepted.Value;
        }

        if (workflowFailure is not null)
        {
            problemDetails.Extensions["workflowFailure"] = workflowFailure;
        }

        if (!string.IsNullOrWhiteSpace(workflowSubmissionFailureKind))
        {
            problemDetails.Extensions["workflowSubmissionFailureKind"] = workflowSubmissionFailureKind;
        }

        if (workflowSubmissionStatusCode.HasValue)
        {
            problemDetails.Extensions["workflowSubmissionStatusCode"] = (int)workflowSubmissionStatusCode.Value;
        }

        if (!string.IsNullOrWhiteSpace(workflowCollectionKey))
        {
            problemDetails.Extensions["workflowCollectionKey"] = workflowCollectionKey;
        }

        if (processStateChanged)
        {
            problemDetails.Extensions["processStateChanged"] = true;
        }

        AddInstanceExtensions(problemDetails, instance);

        return new ObjectResult(problemDetails) { StatusCode = statusCode };
    }

    public static ResumeEndpoint CreateProcessResumeEndpoint(string org, string app, Instance instance)
    {
        var instanceIdentifier = new InstanceIdentifier(instance);
        return new ResumeEndpoint(
            "POST",
            $"/{org}/{app}/instances/{instanceIdentifier.InstanceOwnerPartyId}/{instanceIdentifier.InstanceGuid}/process/resume"
        );
    }

    private static string CreateDetail(
        WorkflowInitializationFlow flow,
        string initializationState,
        string recommendedAction,
        bool? instanceDeleted,
        bool? workflowAccepted,
        bool processStateChanged
    ) =>
        flow == WorkflowInitializationFlow.ProcessStart
            ? CreateProcessStartDetail(initializationState, workflowAccepted, processStateChanged)
            : CreateInstantiationDetail(
                initializationState,
                recommendedAction,
                instanceDeleted,
                workflowAccepted,
                processStateChanged
            );

    private static string CreateInstantiationDetail(
        string initializationState,
        string recommendedAction,
        bool? instanceDeleted,
        bool? workflowAccepted,
        bool processStateChanged
    ) =>
        (initializationState, recommendedAction, instanceDeleted, workflowAccepted, processStateChanged) switch
        {
            (InitializationState.WorkflowNotAccepted, RecommendedAction.RetryInstanceCreation, true, _, _) =>
                "Runtime created the instance, but the initial workflow was not accepted by the workflow engine. The created instance was deleted, so the client can safely retry instance creation.",
            (InitializationState.WorkflowNotAccepted, _, false, _, _) =>
                "Runtime created the instance, but the initial workflow was not accepted by the workflow engine. Runtime could not delete the created instance, so inspect the instance before retrying instance creation.",
            (InitializationState.WorkflowAcceptanceUnknown, _, _, _, _) =>
                "Runtime submitted the initial workflow, but could not determine whether the workflow engine accepted it. Inspect the instance and workflow state before retrying instance creation.",
            (InitializationState.WorkflowFailed, _, _, true, true) =>
                "The workflow engine accepted the initial workflow, but the workflow failed after process state may have been updated in Storage. Do not create a duplicate instance; resolve the workflow failure and call the resume endpoint.",
            (InitializationState.WorkflowFailed, _, _, true, _) =>
                "The workflow engine accepted the initial workflow, but the workflow failed before instance initialization completed. Do not create a duplicate instance; resolve the workflow failure and call the resume endpoint.",
            _ => "Runtime could not complete instance initialization. Inspect the response details before retrying.",
        };

    private static string CreateProcessStartDetail(
        string initializationState,
        bool? workflowAccepted,
        bool processStateChanged
    ) =>
        (initializationState, workflowAccepted, processStateChanged) switch
        {
            (InitializationState.WorkflowNotAccepted, _, _) =>
                "The workflow engine did not accept the process start. The existing instance was not modified, so the client can retry starting the process.",
            (InitializationState.WorkflowAcceptanceUnknown, _, _) =>
                "Runtime submitted the process start workflow, but could not determine whether the workflow engine accepted it. Inspect the instance and workflow state before retrying.",
            (InitializationState.WorkflowFailed, true, true) =>
                "The workflow engine accepted the process start, but the workflow failed after process state may have been updated in Storage. Do not start the process again; resolve the workflow failure and call the resume endpoint.",
            (InitializationState.WorkflowFailed, true, _) =>
                "The workflow engine accepted the process start, but the workflow failed before the process finished starting. Do not start the process again; resolve the workflow failure and call the resume endpoint.",
            _ => "Runtime could not start the process. Inspect the response details before retrying.",
        };

    private static void AddInstanceExtensions(ProblemDetails problemDetails, Instance? instance)
    {
        if (instance?.Id is null)
        {
            return;
        }

        problemDetails.Extensions["instanceId"] = instance.Id;
        var instanceIdentifier = new InstanceIdentifier(instance);
        problemDetails.Extensions["instanceOwnerPartyId"] = instanceIdentifier.InstanceOwnerPartyId;
        problemDetails.Extensions["instanceGuid"] = instanceIdentifier.InstanceGuid;
    }
}
