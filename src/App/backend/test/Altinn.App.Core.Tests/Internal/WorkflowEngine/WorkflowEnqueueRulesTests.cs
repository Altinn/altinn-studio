using System.Text.RegularExpressions;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Tests.TestUtils;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

/// <summary>
/// The rule in <c>Internal/WorkflowEngine/AGENTS.md</c>: a primary workflow either claims the instance first, or comes
/// from a callback of the chain that holds the instance.
/// </summary>
public class WorkflowEnqueueRulesTests
{
    [Fact]
    public void ChainStart_WhosePrimaryWorkflowDoesNotClaimTheInstanceFirst_IsRefused()
    {
        var request = new WorkflowEnqueueRequest
        {
            Workflows =
            [
                Workflow("Process next: Task_1 -> Task_2", CommitProcessState.Key, ProcessingStatusAcquirer.Key),
            ],
        };

        var exception = Assert.Throws<InvalidOperationException>(() =>
            WorkflowEngineService.EnsureChainStartClaimsTheInstance(request)
        );
        Assert.Contains("Process next: Task_1 -> Task_2", exception.Message);
    }

    [Fact]
    public void ChainStart_ThatClaimsTheInstanceFirst_WithAnAuxiliaryWorkflowBeside_IsAccepted()
    {
        var request = new WorkflowEnqueueRequest
        {
            Workflows =
            [
                Workflow("Process next: Task_1 -> Task_2", ProcessingStatusAcquirer.Key, CommitProcessState.Key),
                Workflow("Process next auxiliary: Task_1 -> Task_2", "MovedToAltinnEvent") with
                {
                    IsHead = false,
                },
            ],
        };

        WorkflowEngineService.EnsureChainStartClaimsTheInstance(request);
    }

    /// <summary>
    /// Each place here enqueues workflows on an instance's collection and keeps the rule. A new one fails this test,
    /// so that it is checked against the rule before it is added to the list.
    /// </summary>
    [Fact]
    public void WorkflowsAreEnqueued_OnlyFromThePlacesCheckedAgainstTheRule()
    {
        string sources = Path.GetFullPath(Path.Join(PathUtils.GetCoreTestsPath(), "..", "..", "src"));

        var callers = Directory
            .EnumerateFiles(sources, "*.cs", SearchOption.AllDirectories)
            .Where(static file => !IsBuildOutput(file))
            .Select(file =>
                (
                    File: Path.GetRelativePath(sources, file).Replace('\\', '/'),
                    Calls: Regex.Count(File.ReadAllText(file), @"\.EnqueueWorkflows\(")
                )
            )
            .Where(static caller => caller.Calls > 0)
            .OrderBy(static caller => caller.File, StringComparer.Ordinal)
            .ToList();

        Assert.Equal(
            [
                ("Altinn.App.Core/Internal/WorkflowEngine/Commands/EnqueueAuxiliaryWorkflows.cs", 1),
                ("Altinn.App.Core/Internal/WorkflowEngine/MailboxRelay.cs", 2),
                ("Altinn.App.Core/Internal/WorkflowEngine/WorkflowEngineService.cs", 1),
            ],
            callers
        );
    }

    private static bool IsBuildOutput(string file) =>
        file.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
            .Any(static part => part is "bin" or "obj");

    private static WorkflowRequest Workflow(string operationId, params string[] commandKeys) =>
        new()
        {
            OperationId = operationId,
            Steps =
            [
                .. commandKeys.Select(key => new StepRequest
                {
                    OperationId = key,
                    Command = CommandDefinition.Create("app", new AppCommandData { CommandKey = key }),
                }),
            ],
        };
}
