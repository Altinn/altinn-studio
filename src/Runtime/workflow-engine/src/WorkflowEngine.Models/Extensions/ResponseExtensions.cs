namespace WorkflowEngine.Models.Extensions;

public static class ResponseExtensions
{
    public static bool IsAccepted(this Response response) => response.Status == RequestStatus.Accepted;

    public static bool IsRejected(this Response response) => response.Status == RequestStatus.Rejected;
}
