using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.ProcessHookStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// v8 ran every registered handler, one after the other; v9 runs one per task (and one process-end handler),
/// so handlers that share a task are run by one generated class, in v8's order, or reported when that cannot be done.
/// </summary>
public sealed class HandlerMergeTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    /// <summary>A task-end hook in its own file, doing something only at <paramref name="tasks"/>, or at every task.</summary>
    private void WriteHook(string name, params string[] tasks)
    {
        var guard =
            tasks.Length == 0
                ? ""
                : $"if ({string.Join(" && ", tasks.Select(static task => $"taskId != \"{task}\""))}) return;";
        _app.Write(
            $"logic/{name}.cs",
            InApp(
                $$"""
                public class {{name}} : IProcessTaskEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        {{guard}}
                        await Task.Delay(1);
                    }
                }
                """
            )
        );
    }

    private void WriteProcess(params string[] tasks) =>
        _app.Write(
            "config/process/process.bpmn",
            $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions">
              <bpmn:process id="Process">
                {string.Concat(tasks.Select(static task => $"<bpmn:task id=\"{task}\" />"))}
              </bpmn:process>
            </bpmn:definitions>
            """
        );

    [Fact]
    public void TwoHandlersOfOneTask_AreRunByOneGeneratedClass_InRegistrationOrder()
    {
        // dat/yrkeskvalifikasjon-soknad App/Program.cs:47 and :74, their Storage calls left out.
        _app.Write(
            "logic/ProcessTaskEnd.cs",
            InApp(
                """
                public class ProcessTaskEnd : IProcessTaskEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        if (taskId != "Task_1") return;

                        instance.DataValues ??= new Dictionary<string, string?>();
                        await Task.CompletedTask;
                    }
                }
                """
            )
        );
        _app.Write(
            "logic/PreSubmitProcessor.cs",
            InApp(
                """
                public class PreSubmitProcessor(ILogger<PreSubmitProcessor> logger) : IProcessTaskEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        if (taskId != "Task_1")
                        {
                            return;
                        }

                        logger.LogInformation("Cleaning phone numbers in {InstanceId}", instance.Id);
                        await Task.CompletedTask;
                    }
                }
                """
            )
        );
        _app.Write(
            "Program.cs",
            TopLevelProgram(
                "// Task processing",
                "services.AddTransient<IProcessTaskEnd, ProcessTaskEnd>();",
                "services.AddSingleton<System.Random>();",
                "services.AddTransient<IProcessTaskEnd, PreSubmitProcessor>();"
            )
        );

        var result = Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class ProcessTaskEnd
                {
                    public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

                    public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                    {
                        string taskId = context.TaskId;
                        Instance instance = context.InstanceDataMutator.Instance;
                        if (taskId != "Task_1") return {{HandlerResult}}.Success();

                        instance.DataValues ??= new Dictionary<string, string?>();
                        await Task.CompletedTask;
                        return {{HandlerResult}}.Success();
                    }
                }
                """
            ),
            _app.Read("logic/ProcessTaskEnd.cs")
        );
        Assert.StartsWith(
            InApp("public class PreSubmitProcessor(ILogger<PreSubmitProcessor> logger)\n{"),
            _app.Read("logic/PreSubmitProcessor.cs")
        );
        Assert.Equal(
            $$"""
            using System.Threading.Tasks;

            namespace App.Logic;

            internal sealed class TaskEndingHandlers(ProcessTaskEnd processTaskEnd, PreSubmitProcessor preSubmitProcessor)
                : {{IOnTaskEndingHandler}}
            {
                public bool ShouldRunForTask(string taskId) =>
                    processTaskEnd.ShouldRunForTask(taskId) || preSubmitProcessor.ShouldRunForTask(taskId);

                public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                {
                    // Registration order of the v8 handlers, which v8 ran one after the other.
                    if (processTaskEnd.ShouldRunForTask(context.TaskId) && await processTaskEnd.Execute(context) is {{FailedHandlerResult}} failed)
                    {
                        return failed;
                    }
                    if (preSubmitProcessor.ShouldRunForTask(context.TaskId) && await preSubmitProcessor.Execute(context) is {{FailedHandlerResult}} failed2)
                    {
                        return failed2;
                    }
                    return {{HandlerResult}}.Success();
                }
            }

            """,
            _app.Read("logic/TaskEndingHandlers.cs")
        );
        Assert.Equal(
            TopLevelProgram(
                "// Task processing",
                "services.AddTransient<ProcessTaskEnd>();",
                "services.AddSingleton<System.Random>();",
                "services.AddTransient<PreSubmitProcessor>();",
                $"services.AddTransient<{IOnTaskEndingHandler}, TaskEndingHandlers>();"
            ),
            _app.Read("Program.cs")
        );
        Assert.Equal(
            "Program.cs:8: v8 ran ProcessTaskEnd and PreSubmitProcessor one after the other at Task_1, and v9 runs "
                + "only one IOnTaskEndingHandler there. TaskEndingHandlers (logic/TaskEndingHandlers.cs) now runs them "
                + "in this registration order and is registered as IOnTaskEndingHandler in their place.",
            result.Warnings[0]
        );
        Assert.Contains(
            "logic/ProcessTaskEnd.cs:11: ProcessTaskEnd now has the methods of IOnTaskEndingHandler, which "
                + "TaskEndingHandlers calls. v9 runs it inside the process transition and runs it again when a step "
                + "fails, so calls it makes to other systems, such as e-mail, case numbers or external APIs, can repeat.",
            result.Warnings
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void AClassRegisteredTwice_IsRegisteredOnce()
    {
        // hdir/hego-autorisasjon-og-lisens App/Program.cs:29 and :35.
        WriteHook("ProcessTaskEnd", "Task_1");
        _app.Write(
            "Program.cs",
            Program(
                "services.AddTransient<IProcessTaskEnd, ProcessTaskEnd>();",
                "services.AddSingleton<System.Random>();",
                "// The task end again",
                "services.AddTransient<IProcessTaskEnd, ProcessTaskEnd>();"
            )
        );

        var result = Port(AppFolder);

        Assert.Equal(
            Program(
                $"services.AddTransient<{IOnTaskEndingHandler}, ProcessTaskEnd>();",
                "services.AddSingleton<System.Random>();",
                "// The task end again"
            ),
            _app.Read("Program.cs")
        );
        Assert.Contains(
            "Program.cs:14: removed this second registration of ProcessTaskEnd, which v8 ran twice; v9 does not start "
                + "with two IOnTaskEndingHandler for one task.",
            result.Warnings
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Theory]
    [InlineData("if (services is not null) services.AddTransient<IProcessTaskEnd, ProcessTaskEnd>();")]
    [InlineData("services.AddTransient<IProcessTaskEnd, ProcessTaskEnd>().AddSingleton<System.Random>();")]
    [InlineData("services.AddSingleton<System.Random>().AddTransient<IProcessTaskEnd, ProcessTaskEnd>();")]
    public void ASecondRegistrationThatIsNotAStatementOfItsOwn_IsATodo_AndStays(string second)
    {
        WriteHook("ProcessTaskEnd", "Task_1");
        _app.Write("Program.cs", Program("services.AddTransient<IProcessTaskEnd, ProcessTaskEnd>();", second));

        var result = Port(AppFolder);

        Assert.Equal(
            Program($"services.AddTransient<{IOnTaskEndingHandler}, ProcessTaskEnd>();", second),
            _app.Read("Program.cs")
        );
        Assert.Equal(
            [
                "Program.cs:12: this is a second registration of ProcessTaskEnd, which v8 ran twice, and v9 does not "
                    + "start with two IOnTaskEndingHandler for one task. The upgrade removes only a registration that "
                    + "is a statement of its own in a block, so remove this one by hand.",
            ],
            result.Todos
        );
    }

    [Fact]
    public void AHandlerAPackageRegistersAtTheSameTask_IsATodo_AndTheAppClassIsStillPorted()
    {
        // dibk/rs-v4: the package's Task_1 guard comes in through AddDibkCommonAltinnAppServices.
        WriteHook("Hook", "Task_1");
        _app.Write(
            "App.csproj",
            """
            <Project Sdk="Microsoft.NET.Sdk.Web">
              <ItemGroup>
                <PackageReference Include="Altinn.App.Api" Version="8.7.0" />
                <PackageReference Include="Dibk.Ftpb.Common.AltinnApps" Version="1.7.0" />
              </ItemGroup>
            </Project>
            """
        );
        _app.Write(
            "Program.cs",
            Program(
                "Dibk.Ftpb.Common.AltinnApps.DibkCommonAltinnAppServices.AddDibkCommonAltinnAppServices(services);",
                "services.AddTransient<IProcessTaskEnd, Hook>();"
            )
        );

        var result = Port(AppFolder, Package);

        Assert.Equal(
            [
                "App: 2 handlers run at Task_1 (ProcessTaskEnd, Hook); v9 starts only with one per task. "
                    + "Dibk.Ftpb.Common.AltinnApps 1.7.0 registers ProcessTaskEnd; a v9 version of the package is "
                    + "needed, then combine its check with Hook.",
                "Program.cs:11: App: Dibk.Ftpb.Common.AltinnApps 1.7.0 registers ProcessTaskEnd through "
                    + "AddDibkCommonAltinnAppServices, and ProcessTaskEnd implements IProcessTaskEnd, which v9 removed or "
                    + "moved. The app needs a v9 version of the package.",
            ],
            result.Todos
        );
        Assert.Contains("Program.cs:12: registered Hook as IOnTaskEndingHandler.", result.Warnings);
    }

    [Fact]
    public void HandlersOfATaskWhereOneIsBlocked_AreAllLeftAsTheyAre()
    {
        WriteHook("Hook", "Task_1");
        var blocked = InApp(
            """
            public partial class Blocked : IProcessTaskEnd
            {
                public Task End(string taskId, Instance instance) => Task.CompletedTask;
            }
            """
        );
        _app.Write("logic/Blocked.cs", blocked);
        var hook = _app.Read("logic/Hook.cs");
        var program = Program(
            "services.AddTransient<IProcessTaskEnd, Hook>();",
            "services.AddTransient<IProcessTaskEnd, Blocked>();"
        );
        _app.Write("Program.cs", program);

        var result = Port(AppFolder);

        Assert.Single(
            result.Todos,
            todo =>
                todo.StartsWith(
                    $"logic/Blocked.cs:{LineOf(blocked, "public partial class Blocked")}: Blocked implements "
                        + "IProcessTaskEnd, which v9 removed, and was not ported: the class is partial.",
                    StringComparison.Ordinal
                )
        );
        Assert.Equal(hook, _app.Read("logic/Hook.cs"));
        Assert.Equal(program, _app.Read("Program.cs"));
    }

    [Fact]
    public void HandlersRegisteredInDifferentMethods_AreATodo_AndEachIsPorted()
    {
        WriteHook("First", "Task_1");
        WriteHook("Second", "Task_1");
        _app.Write(
            "Program.cs",
            Program("services.AddTransient<IProcessTaskEnd, First>();")
                .Replace(
                    "    public static void RegisterCustomAppServices",
                    "    public static void More(IServiceCollection services)\n    {\n        services.AddTransient<IProcessTaskEnd, Second>();\n    }\n\n    public static void RegisterCustomAppServices",
                    StringComparison.Ordinal
                )
        );

        var result = Port(AppFolder);

        Assert.Equal(
            [
                "App: 2 handlers run at Task_1 (Second, First); v9 starts only with one per task. They are not each "
                    + "registered once by a statement of the same method, so the upgrade cannot tell the order v8 ran "
                    + "them in; combine them into one IOnTaskEndingHandler.",
            ],
            result.Todos
        );
        Assert.Contains(
            result.Warnings,
            static warning => warning.Contains("registered First as", StringComparison.Ordinal)
        );
        Assert.Contains(
            result.Warnings,
            static warning => warning.Contains("registered Second as", StringComparison.Ordinal)
        );
    }

    [Fact]
    public void AClassWithTwoTaskHooksThatWouldBothBeCombined_IsATodo_AndTheirHandlersAreLeftAsTheyAre()
    {
        var classes = InApp(
            """
            public class Both : IProcessTaskStart, IProcessTaskEnd
            {
                public async Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                {
                    if (taskId != "Task_1") return;
                    await Task.Delay(1);
                }

                public async Task End(string taskId, Instance instance)
                {
                    if (taskId != "Task_1") return;
                    await Task.Delay(2);
                }
            }

            public class OtherStart : IProcessTaskStart
            {
                public async Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                {
                    if (taskId != "Task_1") return;
                    await Task.Delay(3);
                }
            }

            public class OtherEnd : IProcessTaskEnd
            {
                public async Task End(string taskId, Instance instance)
                {
                    if (taskId != "Task_1") return;
                    await Task.Delay(4);
                }
            }
            """
        );
        _app.Write("logic/Both.cs", classes);
        var program = Program(
            "services.AddTransient<IProcessTaskStart, Both>();",
            "services.AddTransient<IProcessTaskEnd, Both>();",
            "services.AddTransient<IProcessTaskStart, OtherStart>();",
            "services.AddTransient<IProcessTaskEnd, OtherEnd>();"
        );
        _app.Write("Program.cs", program);

        var result = Port(AppFolder);

        Assert.Equal(
            [
                Todo(
                    "logic/Both.cs:11: Both implements IProcessTaskStart, which v9 removed, and was not ported: v8 ran "
                        + "it together with OtherStart at Task_1, and the upgrade combines only one of a class's task "
                        + "hooks (IProcessTaskStart and IProcessTaskEnd) with other classes. Move the code to "
                        + "IOnTaskStartingHandler: ShouldRunForTask(taskId) and Execute(context), with instance data "
                        + "from context.InstanceDataMutator."
                ),
                Todo(
                    "logic/Both.cs:11: Both implements IProcessTaskEnd, which v9 removed, and was not ported: v8 ran "
                        + "it together with OtherEnd at Task_1, and the upgrade combines only one of a class's task "
                        + "hooks (IProcessTaskStart and IProcessTaskEnd) with other classes. Move the code to "
                        + "IOnTaskEndingHandler: ShouldRunForTask(taskId) and Execute(context), with instance data "
                        + "from context.InstanceDataMutator."
                ),
            ],
            result.Messages
        );
        Assert.Equal(classes, _app.Read("logic/Both.cs"));
        Assert.Equal(program, _app.Read("Program.cs"));
    }

    [Fact]
    public void AClassCombinedForATaskHookAndForTheProcessEnd_ImplementsNeitherV8Interface()
    {
        _app.Write(
            "logic/Both.cs",
            InApp(
                """
                public class Both : IProcessTaskEnd, IProcessEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        if (taskId != "Task_1") return;
                        await Task.Delay(1);
                    }

                    public Task End(Instance instance, List<InstanceEvent>? events) => Task.Delay(2);
                }

                public class OtherEnd : IProcessTaskEnd
                {
                    public async Task End(string taskId, Instance instance)
                    {
                        if (taskId != "Task_1") return;
                        await Task.Delay(3);
                    }
                }

                public class Archive : IProcessEnd
                {
                    public Task End(Instance instance, List<InstanceEvent>? events) => Task.Delay(4);
                }
                """
            )
        );
        _app.Write(
            "Program.cs",
            Program(
                "services.AddTransient<IProcessTaskEnd, Both>();",
                "services.AddTransient<IProcessEnd, Both>();",
                "services.AddTransient<IProcessTaskEnd, OtherEnd>();",
                "services.AddTransient<IProcessEnd, Archive>();"
            )
        );

        Port(AppFolder);

        Assert.Contains("public class Both\n{", _app.Read("logic/Both.cs"), StringComparison.Ordinal);
        AssertCompilesAgainstV9(AppFolder);
    }

    public static TheoryData<string, string[], string[], string[], bool> Overlaps =>
        new()
        {
            { "different tasks", ["Task_1"], ["Task_2"], [], false },
            { "the same task", ["Task_1"], ["Task_1"], [], true },
            { "a shared task the process does not have", ["Task_1", "Task_9"], ["Task_9"], ["Task_1"], false },
            { "a shared task, the process unknown", ["Task_1", "Task_9"], ["Task_9"], [], true },
            { "every task and a task the process does not have", [], ["Task_9"], ["Task_1"], false },
        };

    [Theory]
    [MemberData(nameof(Overlaps))]
    public void CombinesOnlyHandlersThatShareATaskOfTheProcess(
        string label,
        string[] firstTasks,
        string[] secondTasks,
        string[] processTasks,
        bool combined
    )
    {
        _ = label;
        WriteHook("First", firstTasks);
        WriteHook("Second", secondTasks);
        if (processTasks.Length > 0)
        {
            WriteProcess(processTasks);
        }

        _app.Write(
            "Program.cs",
            Program(
                "services.AddTransient<IProcessTaskEnd, First>();",
                "services.AddTransient<IProcessTaskEnd, Second>();"
            )
        );

        Port(AppFolder);

        Assert.Equal(combined, File.Exists(Path.Combine(AppFolder, "logic", "TaskEndingHandlers.cs")));
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void TwoProcessEndHandlers_AreRunByOneGeneratedClass()
    {
        // No app registers two; v9 starts with only one registered, whatever it does.
        foreach (var name in new[] { "Archive", "Notify" })
        {
            _app.Write(
                $"logic/{name}.cs",
                InApp(
                    $$"""
                    public class {{name}} : IProcessEnd
                    {
                        public Task End(Instance instance, List<InstanceEvent>? events) => Task.Delay(1);
                    }
                    """
                )
            );
        }

        _app.Write(
            "Program.cs",
            Program("services.AddTransient<IProcessEnd, Archive>();", "services.AddTransient<IProcessEnd, Notify>();")
        );

        Port(AppFolder);

        Assert.Equal(
            $$"""
            using System.Threading.Tasks;

            namespace App.Logic;

            internal sealed class ProcessEndedHandlers(Archive archive, Notify notify)
                : {{IOnProcessEndedHandler}}
            {
                public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
                {
                    // Registration order of the v8 handlers, which v8 ran one after the other.
                    if (await archive.Execute(context) is {{FailedHandlerResult}} failed)
                    {
                        return failed;
                    }
                    if (await notify.Execute(context) is {{FailedHandlerResult}} failed2)
                    {
                        return failed2;
                    }
                    return {{HandlerResult}}.Success();
                }
            }

            """,
            _app.Read("logic/ProcessEndedHandlers.cs")
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Theory]
    [InlineData("AddSingleton", "AddScoped", "AddScoped")]
    [InlineData("AddTransient", "AddSingleton", "AddTransient")]
    [InlineData("TryAddSingleton", "AddScoped", "TryAddScoped")]
    public void TheGeneratedClass_IsRegisteredWithTheShortestLifetimeOfItsMembers_AsTheFirstIsAdded(
        string first,
        string second,
        string composite
    )
    {
        WriteHook("First", "Task_1");
        WriteHook("Second", "Task_1");
        _app.Write(
            "Program.cs",
            Program($"services.{first}<IProcessTaskEnd, First>();", $"services.{second}<IProcessTaskEnd, Second>();")
                .Replace(
                    "using Microsoft.Extensions.DependencyInjection;\n",
                    "using Microsoft.Extensions.DependencyInjection;\nusing Microsoft.Extensions.DependencyInjection.Extensions;\n",
                    StringComparison.Ordinal
                )
        );

        Port(AppFolder);

        Assert.Contains(
            $"services.{composite}<{IOnTaskEndingHandler}, TaskEndingHandlers>();",
            _app.Read("Program.cs"),
            StringComparison.Ordinal
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void ClassesThatShareAName_AreNamedByTheirNamespace()
    {
        // dibk ×9: the package's ProcessTaskEnd and the app's; here two of the app's.
        WriteHook("ProcessTaskEnd", "Task_1");
        _app.Write(
            "other/ProcessTaskEnd.cs",
            InApp(
                    """
                    public class ProcessTaskEnd : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance) => Task.Delay(1);
                    }
                    """
                )
                .Replace("namespace App.Logic;", "namespace App.Other;", StringComparison.Ordinal)
        );
        _app.Write(
            "Program.cs",
            Program(
                "services.AddTransient<IProcessTaskEnd, App.Logic.ProcessTaskEnd>();",
                "services.AddTransient<IProcessTaskEnd, App.Other.ProcessTaskEnd>();"
            )
        );

        Port(AppFolder);

        Assert.Contains(
            "internal sealed class TaskEndingHandlers(ProcessTaskEnd appLogicProcessTaskEnd, "
                + "global::App.Other.ProcessTaskEnd appOtherProcessTaskEnd)",
            _app.Read("logic/TaskEndingHandlers.cs")
        );
        Assert.Contains(
            $"services.AddTransient<{IOnTaskEndingHandler}, App.Logic.TaskEndingHandlers>();",
            _app.Read("Program.cs")
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void GeneratedClassesInTwoNamespaces_GetDifferentNames()
    {
        // din/innsending: two groups of task-end hooks at different tasks, in two namespaces Program.cs imports.
        WriteHook("First", "Task_1");
        WriteHook("Second", "Task_1");
        foreach (var name in new[] { "Third", "Fourth" })
        {
            WriteHook(name, "Task_2");
            _app.Write(
                $"other/{name}.cs",
                _app.Read($"logic/{name}.cs")
                    .Replace("namespace App.Logic;", "namespace App.Other;", StringComparison.Ordinal)
            );
            File.Delete(Path.Combine(AppFolder, "logic", $"{name}.cs"));
        }

        static string ImportingBoth(string program) =>
            program.Replace("using App.Logic;\n", "using App.Logic;\nusing App.Other;\n", StringComparison.Ordinal);
        _app.Write(
            "Program.cs",
            ImportingBoth(
                Program(
                    "services.AddTransient<IProcessTaskEnd, First>();",
                    "services.AddTransient<IProcessTaskEnd, Second>();",
                    "services.AddTransient<IProcessTaskEnd, Third>();",
                    "services.AddTransient<IProcessTaskEnd, Fourth>();"
                )
            )
        );

        Port(AppFolder);

        Assert.Equal(
            ImportingBoth(
                Program(
                    "services.AddTransient<First>();",
                    "services.AddTransient<Second>();",
                    $"services.AddTransient<{IOnTaskEndingHandler}, TaskEndingHandlers>();",
                    "services.AddTransient<Third>();",
                    "services.AddTransient<Fourth>();",
                    $"services.AddTransient<{IOnTaskEndingHandler}, TaskEndingHandlers2>();"
                )
            ),
            _app.Read("Program.cs")
        );
        Assert.Contains(
            "internal sealed class TaskEndingHandlers2(Third third, Fourth fourth)",
            _app.Read("other/TaskEndingHandlers2.cs"),
            StringComparison.Ordinal
        );
        AssertCompilesAgainstV9(AppFolder);
    }
}
