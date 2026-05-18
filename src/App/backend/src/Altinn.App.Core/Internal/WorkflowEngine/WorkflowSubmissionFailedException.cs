using System.Net;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

internal enum WorkflowSubmissionFailureKind
{
    NotAccepted,
    Unknown,
}

internal sealed class WorkflowSubmissionFailedException : Exception
{
    public WorkflowSubmissionFailureKind Kind { get; }

    public HttpStatusCode? StatusCode { get; }

    public string? CollectionKey { get; }

    private WorkflowSubmissionFailedException(
        WorkflowSubmissionFailureKind kind,
        string message,
        HttpStatusCode? statusCode,
        string? collectionKey,
        Exception? innerException
    )
        : base(message, innerException)
    {
        Kind = kind;
        StatusCode = statusCode;
        CollectionKey = collectionKey;
    }

    public static WorkflowSubmissionFailedException NotAccepted(
        string message,
        HttpStatusCode? statusCode = null,
        string? collectionKey = null,
        Exception? innerException = null
    ) => new(WorkflowSubmissionFailureKind.NotAccepted, message, statusCode, collectionKey, innerException);

    public static WorkflowSubmissionFailedException Unknown(
        string message,
        HttpStatusCode? statusCode = null,
        string? collectionKey = null,
        Exception? innerException = null
    ) => new(WorkflowSubmissionFailureKind.Unknown, message, statusCode, collectionKey, innerException);
}

internal sealed class WorkflowExecutionFailedException : Exception
{
    public WorkflowExecutionFailedException(
        Instance instance,
        WorkflowFailure workflowFailure,
        bool processStateChanged,
        string message
    )
        : base(message)
    {
        Instance = instance;
        WorkflowFailure = workflowFailure;
        ProcessStateChanged = processStateChanged;
    }

    public Instance Instance { get; }

    public WorkflowFailure WorkflowFailure { get; }

    public bool ProcessStateChanged { get; }
}
