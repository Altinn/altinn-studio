using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Internal.Process;

internal static class ProcessStatusHelper
{
    internal const string MutationBlockedProblemType = "instance-processing";

    public static bool IsIdle(Instance instance)
    {
        return GetBlockingStatus(instance) is null;
    }

    public static ProcessStatus? GetBlockingStatus(Instance instance)
    {
        ArgumentNullException.ThrowIfNull(instance);
        ProcessStatus? status = instance.Process?.Status;
        return status is null or ProcessStatus.Idle ? null : status;
    }

    public static ProblemDetails? GetMutationProblem(Instance instance)
    {
        return GetBlockingStatus(instance) is { } currentStatus ? CreateMutationProblem(currentStatus) : null;
    }

    public static ProblemDetails CreateMutationProblem(ProcessStatus currentStatus)
    {
        var problem = new ProblemDetails
        {
            Type = MutationBlockedProblemType,
            Title = "Instance mutation blocked.",
            Detail =
                $"The instance cannot be changed while its process status is '{currentStatus.ToString().ToLowerInvariant()}'.",
            Status = StatusCodes.Status409Conflict,
        };
        problem.Extensions["processStatus"] = currentStatus;
        return problem;
    }
}
