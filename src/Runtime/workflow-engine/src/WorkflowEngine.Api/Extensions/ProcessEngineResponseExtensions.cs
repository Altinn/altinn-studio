using WorkflowEngine.Models;

namespace WorkflowEngine.Api.Extensions;

internal static class ProcessEngineResponseExtensions
{
    public static bool IsAccepted(this Response response) => response.Status == RequestStatus.Accepted;

    public static bool IsRejected(this Response response) => response.Status == RequestStatus.Rejected;
}
