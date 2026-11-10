using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// The dashboard reads a step's labels to attribute it to the BPMN element it runs for, instead of
/// recognizing the command by name. That only works if the labels the caller enqueued survive all the way
/// onto the card's step, so this pins the mapper's end of that contract.
/// </summary>
public class DashboardStepMapperTests
{
    private static Step Step(Dictionary<string, string>? labels) =>
        new()
        {
            OperationId = "StartTask",
            ProcessingOrder = 0,
            Command = CommandDefinition.Create("app"),
            Labels = labels,
        };

    [Fact]
    public void MapStep_CarriesTheStepsLabels()
    {
        var labels = new Dictionary<string, string>(StringComparer.Ordinal) { ["processNextElement"] = "Task_2" };

        var mapped = DashboardMapper.MapStep(Step(labels), stateChanged: false);

        Assert.NotNull(mapped.Labels);
        Assert.Equal("Task_2", Assert.Contains("processNextElement", mapped.Labels));
    }

    [Fact]
    public void MapStep_LeavesLabelsNullWhenTheStepHasNone()
    {
        // Null rather than an empty dictionary: the dashboard's JSON omits nulls, so an unlabeled step
        // costs no bytes on a payload that carries every step of every workflow on screen.
        var mapped = DashboardMapper.MapStep(Step(labels: null), stateChanged: false);

        Assert.Null(mapped.Labels);
    }
}
