using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

public class DashboardStepMapperTests
{
    [Fact]
    public void MapStep_PassesStepLabelsThrough()
    {
        // The dashboard brackets a transition's steps by the task labels an app sets on them, so the
        // projection must carry them; without them every step falls back to the command-name mapping.
        var step = new Step
        {
            OperationId = "ResolveSignees",
            ProcessingOrder = 3,
            Command = CommandDefinition.Create("app"),
            Labels = new Dictionary<string, string>
            {
                ["processTask"] = "Task_Signing",
                ["processTaskPhase"] = "start",
            },
        };

        DashboardStepDto dto = DashboardMapper.MapStep(step, stateChanged: false);

        Assert.NotNull(dto.Labels);
        Assert.Equal("Task_Signing", dto.Labels["processTask"]);
        Assert.Equal("start", dto.Labels["processTaskPhase"]);
        Assert.Equal("ResolveSignees", dto.CommandDetail);
    }

    [Fact]
    public void MapStep_UnlabelledStep_HasNoLabels()
    {
        var step = new Step
        {
            OperationId = "CommitProcessState",
            ProcessingOrder = 4,
            Command = CommandDefinition.Create("app"),
        };

        DashboardStepDto dto = DashboardMapper.MapStep(step, stateChanged: true);

        Assert.Null(dto.Labels);
        Assert.True(dto.StateChanged);
    }
}
