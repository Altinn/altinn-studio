using System.Net;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>Rejecting a frozen enqueue request cannot be repaired by replaying the identical request.</summary>
internal static class SigningWorkflowEnqueueFailure
{
    internal static bool IsPermanent(Exception exception) =>
        exception is HttpRequestException { StatusCode: { } status }
        && (int)status is >= 400 and < 500
        && status is not HttpStatusCode.RequestTimeout and not HttpStatusCode.TooManyRequests;

    internal static ProcessEngineCommandResult From(Exception exception) =>
        IsPermanent(exception)
            ? ProcessEngineCommandResult.FailedPermanent(exception.Message, "SigningWorkflowEnqueueRejected")
            : FailedProcessEngineCommandResult.Retryable(exception);
}
