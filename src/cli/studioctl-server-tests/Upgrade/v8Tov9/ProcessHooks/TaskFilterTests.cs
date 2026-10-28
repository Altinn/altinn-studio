using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration.ProcessHooks;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.CSharp.Syntax;
using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.ProcessHookStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// The <c>ShouldRunForTask</c> a ported task hook gets names the tasks its body can do anything for, from its
/// own guards, and is <c>true</c> whenever that cannot be told.
/// </summary>
public sealed class TaskFilterTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string> Filters =>
        new()
        {
            { "no filter", "Work();", "true" },
            { "an if around the body", "if (taskId == \"Task_1\") { Work(); }", "taskId == \"Task_1\"" },
            { "an early return", "if (taskId != \"Task_1\") return; Work();", "taskId == \"Task_1\"" },
            { "a call before the guard", "Work(); if (taskId != \"Task_1\") return; Work();", "true" },
            {
                "if and else if",
                "if (taskId == \"Task_1\") { Work(); } else if (taskId == \"Task_2\") { Work(); }",
                "taskId == \"Task_1\" || taskId == \"Task_2\""
            },
            { "an else that does something", "if (taskId == \"Task_1\") { Work(); } else { Work(); }", "true" },
            {
                "|| in one condition",
                "if (taskId == \"Task_1\" || taskId == \"Task_2\") Work();",
                "taskId == \"Task_1\" || taskId == \"Task_2\""
            },
            {
                // nfk: if (taskId != "Task_1" || instance?.Data == null) { return; }
                "|| with another condition in an early return",
                "if (taskId != \"Task_1\" || instance?.Data == null) { return; } Work();",
                "taskId == \"Task_1\""
            },
            {
                // pat: paymentMethod == "invoice" && taskId == "Task_Signature" || ...
                "&& with another condition",
                "if (instance.Id == \"x\" && taskId == \"Task_Signature\" || instance.Id != \"x\" && taskId == \"Task_Payment\") Work();",
                "taskId == \"Task_Signature\" || taskId == \"Task_Payment\""
            },
            { "negated and parenthesized", "if (!(taskId == \"Task_1\")) return; Work();", "taskId == \"Task_1\"" },
            { "the constant on the left", "if (\"Task_1\" == taskId) Work();", "taskId == \"Task_1\"" },
            {
                "Equals with a comparison that respects case",
                "if (taskId.Equals(\"Task_1\", StringComparison.InvariantCulture)) Work();",
                "taskId == \"Task_1\""
            },
            {
                "Equals ignoring case",
                "if (taskId.Equals(\"Task_1\", StringComparison.OrdinalIgnoreCase)) Work();",
                "true"
            },
            { "string.Equals", "if (string.Equals(taskId, \"Task_1\")) Work();", "taskId == \"Task_1\"" },
            { "a constant field", "if (taskId != TaskEnd) return; Work();", "taskId == TaskEnd" },
            {
                "a local constant, which the filter cannot see",
                "const string task = \"Task_1\"; if (taskId != task) return; Work();",
                "taskId == \"Task_1\""
            },
            {
                // tra/egenerklaering App/helpers/ProcessTaskStart.cs:22.
                "switch labels",
                "switch (taskId) { case \"Task_3\": Work(); break; }",
                "taskId == \"Task_3\""
            },
            {
                // din/innsending App/Core/Features/SharedProcessing/InnsendtVersjonsetter.cs:16.
                "Contains on a static readonly list",
                "if (!Constants.SkjemaTasks.Contains(taskId)) return; Work();",
                "Constants.SkjemaTasks.Contains(taskId)"
            },
            {
                "Contains on a set with a comparer, which may ignore case",
                "if (!Constants.AnyCase.Contains(taskId)) return; Work();",
                "true"
            },
            {
                "an awaited Task.CompletedTask, which does nothing",
                "if (taskId == \"Task_1\") { Work(); } await Task.CompletedTask;",
                "taskId == \"Task_1\""
            },
            {
                // Dibk.Ftpb.Common.AltinnApps TaskEnd/ProcessTaskEnd.cs:9.
                "a throw in a guard",
                "if (taskId.Equals(\"Task_1\") && !instance.Data.Any(d => d.DataType == \"Signatur\")) { throw new InvalidOperationException(\"Signatur\"); }",
                "taskId == \"Task_1\""
            },
            {
                "a throw in a guard that calls nothing",
                "if (taskId == \"Task_1\" && instance.Data.Count == 0) { throw new InvalidOperationException(\"No data\"); }",
                "taskId == \"Task_1\""
            },
            { "the task id given to a helper", "await Helper(taskId);", "true" },
            {
                // pat/patent App/logic/TaskProcessor/ProcessTaskEnd.cs:45: the form is read before the guard.
                "a read through a helper before the guard",
                "var form = await Read(instance); if (form.Length > 0 && taskId == \"Task_Signature\") Work();",
                "true"
            },
            {
                "a catch that continues after the try, entered from a guard that does nothing itself",
                "try { if (taskId != \"Task_1\") { var item = instance.Data[5]; return; } } catch (ArgumentOutOfRangeException) { } Work();",
                "true"
            },
            { "nothing to do", "", "false" },
        };

    [Theory]
    [MemberData(nameof(Filters))]
    public void FiltersOnTheTasksTheHookDoesAnythingFor(string label, string body, string expected)
    {
        _ = label;
        _app.Write(
            "logic/Hook.cs",
            InApp(
                $$"""
                public static class Constants
                {
                    public static readonly List<string> SkjemaTasks = [ "UtfyllingForside", "UtfyllingKonkurs" ];
                    public static readonly HashSet<string> AnyCase = new(StringComparer.OrdinalIgnoreCase) { "Task_1" };
                }

                public class Hook : IProcessTaskEnd
                {
                    private const string TaskEnd = "Task_1";

                    public async Task End(string taskId, Instance instance)
                    {
                        {{body}}
                    }

                    private static void Work() { }

                    private static Task Helper(string taskId) => Task.CompletedTask;

                    private static Task<string> Read(Instance instance) => Task.FromResult(instance.Id);
                }
                """
            )
        );
        var scanner = SemanticScannerFactory.CreateScanner(AppFolder, V8);
        var file = scanner.Files[0];
        var model = file.SemanticModel ?? throw new InvalidOperationException("No semantic model.");
        var method = file
            .Root.DescendantNodes()
            .OfType<MethodDeclarationSyntax>()
            .Single(static declaration => declaration.Identifier.ValueText == "End");
        var taskId =
            model.GetDeclaredSymbol(method, TestContext.Current.CancellationToken)?.Parameters[0]
            ?? throw new InvalidOperationException("No task id.");

        var filter = TaskFilter.Condition(TaskFilter.Of(method, taskId, model), "taskId");

        Assert.Equal(expected, filter.ToString());
    }
}
