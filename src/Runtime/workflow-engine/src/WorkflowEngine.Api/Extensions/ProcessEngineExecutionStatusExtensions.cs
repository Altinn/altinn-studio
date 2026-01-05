namespace Altinn.App.ProcessEngine.Extensions;

internal static class ProcessEngineExecutionStatusExtensions
{
    public static bool IsSuccess(this ProcessEngineExecutionResult result) =>
        result.Status == ProcessEngineExecutionStatus.Success;

    public static bool IsError(this ProcessEngineExecutionResult result) =>
        result.Status == ProcessEngineExecutionStatus.Error;
}
