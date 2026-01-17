namespace WorkflowEngine.Models.Extensions;

public static class ResponseExtensions
{
    public static bool IsAccepted(this EngineResponse engineResponse) =>
        engineResponse.Status == EngineRequestStatus.Accepted;

    public static bool IsRejected(this EngineResponse engineResponse) =>
        engineResponse.Status == EngineRequestStatus.Rejected;
}
