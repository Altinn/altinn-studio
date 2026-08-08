using Altinn.App.Core.Internal.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed class ProcessStatusHelperTests
{
    [Fact]
    public void IsIdle_WhenProcessIsAbsent_ReturnsTrue()
    {
        var instance = new Instance();

        Assert.True(ProcessStatusHelper.IsIdle(instance));
    }

    [Theory]
    [InlineData(null, true)]
    [InlineData(ProcessStatus.Idle, true)]
    [InlineData(ProcessStatus.Processing, false)]
    public void IsIdle_TreatsAbsentAndIdleAsIdle(ProcessStatus? status, bool expected)
    {
        var instance = new Instance { Process = new ProcessState { Status = status } };

        Assert.Equal(expected, ProcessStatusHelper.IsIdle(instance));
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public void GetMutationProblem_ExposesExactBlockingStatus(ProcessStatus status)
    {
        var instance = new Instance { Process = new ProcessState { Status = status } };

        var problem = ProcessStatusHelper.GetMutationProblem(instance);

        Assert.NotNull(problem);
        Assert.Equal(409, problem.Status);
        Assert.Equal(ProcessStatusHelper.MutationBlockedProblemType, problem.Type);
        Assert.Equal(status, problem.Extensions["processStatus"]);
        Assert.Contains($"'{status.ToString().ToLowerInvariant()}'", problem.Detail, StringComparison.Ordinal);
    }
}
