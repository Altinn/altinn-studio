using WorkflowEngine.Models;

namespace Altinn.App.ProcessEngine.Extensions;

internal static class ProcessEngineResponseExtensions
{
    public static bool IsAccepted(this ProcessEngineResponse response) =>
        response.Status == ProcessEngineRequestStatus.Accepted;

    public static bool IsRejected(this ProcessEngineResponse response) =>
        response.Status == ProcessEngineRequestStatus.Rejected;
}
