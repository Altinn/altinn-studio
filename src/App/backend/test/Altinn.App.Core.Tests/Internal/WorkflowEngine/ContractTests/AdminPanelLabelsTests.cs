using System.Text.Json;
using Altinn.App.Core.Internal.WorkflowEngine;
using Xunit;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.ContractTests;

/// <summary>
/// Guards the labels Studio's admin panel reads off the workflows the app enqueues: it groups an instance's
/// workflows by transition and names their steps by them. The panel keeps their names in
/// <c>appWorkflowLabels.json</c> (embedded here from the Designer frontend), so renaming a label in the app
/// fails this test until the panel's file is renamed with it.
/// </summary>
public class AdminPanelLabelsTests
{
    [Fact]
    public void AdminPanel_ReadsTheLabelsTheAppWrites()
    {
        var appLabels = new Dictionary<string, string>
        {
            ["sourceTask"] = ProcessNextRequestFactory.ProcessNextSourceTaskLabel,
            ["sourceFlow"] = ProcessNextRequestFactory.ProcessNextSourceFlowLabel,
            ["targetTask"] = ProcessNextRequestFactory.ProcessNextTargetTaskLabel,
            ["element"] = ProcessNextRequestFactory.ProcessNextElementLabel,
            ["stepName"] = WorkflowCommandSet.StepNameLabel,
        };

        Assert.Equal(appLabels, ReadAdminPanelLabels());
    }

    private static Dictionary<string, string> ReadAdminPanelLabels()
    {
        var assembly = typeof(AdminPanelLabelsTests).Assembly;
        var resourceName = assembly
            .GetManifestResourceNames()
            .Single(name => name.EndsWith("appWorkflowLabels.json", StringComparison.Ordinal));
        using var stream =
            assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException(
                $"Embedded admin panel labels '{resourceName}' could not be opened."
            );
        return JsonSerializer.Deserialize<Dictionary<string, string>>(stream)
            ?? throw new InvalidOperationException("The admin panel's labels file is empty.");
    }
}
