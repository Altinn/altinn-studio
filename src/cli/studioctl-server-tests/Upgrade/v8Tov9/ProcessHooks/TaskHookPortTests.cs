using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.ProcessHookStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// Task hooks whose code does not call Storage move to the v9 handlers, with their task
/// filter, their v8 parameters read from the context, and success returned wherever they returned before.
/// </summary>
public sealed class TaskHookPortTests : IDisposable
{
    private const string HookPath = "logic/Hook.cs";

    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    public static TheoryData<string, string, string> Ported =>
        new()
        {
            {
                // dat/biologiske-faktorer-melding App/logic/ProcessTaskEnd.cs:28, its Storage call left out.
                "early return, and a helper that takes the instance",
                """
                    public class ProcessTaskEnd : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            if (taskId != "Task_1") return;

                            await OppdaterDataValues(instance);
                        }

                        /// <summary>
                        /// Oppdaterer DataValues ved innsending av skjema
                        /// </summary>
                        private Task OppdaterDataValues(Instance instance)
                        {
                            instance.DataValues ??= new Dictionary<string, string?>();
                            return Task.CompletedTask;
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            Instance instance = context.InstanceDataMutator.Instance;
                            if (taskId != "Task_1") return {{HandlerResult}}.Success();

                            await OppdaterDataValues(instance);
                            return {{HandlerResult}}.Success();
                        }

                        /// <summary>
                        /// Oppdaterer DataValues ved innsending av skjema
                        /// </summary>
                        private Task OppdaterDataValues(Instance instance)
                        {
                            instance.DataValues ??= new Dictionary<string, string?>();
                            return Task.CompletedTask;
                        }
                    }
                    """
            },
            {
                // brg/konkursbehandling App/logic/dataProcessing/ProcessTaskEnd.cs:8.
                "no task filter, ending with an awaited Task.CompletedTask",
                """
                    public class ProcessTaskEnd(ILogger<ProcessTaskEnd> logger) : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance)
                        {
                            await LogInstanceWhenCompleted(instance);
                            await Task.CompletedTask;
                        }

                        private Task LogInstanceWhenCompleted(Instance instance)
                        {
                            string instanceId = instance.Id;

                            //TODO: Legge til infomrasjon for når tjenesten er arkivert
                            logger.LogInformation("Konkursbehandling arkivert {InstanceId}", instanceId);
                            return Task.CompletedTask;
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd(ILogger<ProcessTaskEnd> logger) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            Instance instance = context.InstanceDataMutator.Instance;
                            await LogInstanceWhenCompleted(instance);
                            await Task.CompletedTask;
                            return {{HandlerResult}}.Success();
                        }

                        private Task LogInstanceWhenCompleted(Instance instance)
                        {
                            string instanceId = instance.Id;

                            //TODO: Legge til infomrasjon for når tjenesten er arkivert
                            logger.LogInformation("Konkursbehandling arkivert {InstanceId}", instanceId);
                            return Task.CompletedTask;
                        }
                    }
                    """
            },
            {
                // skd/formueinntekt-skattemelding-v2 App/logic/TaskProcessing/MyTaskEndHandler.cs:14.
                "not async, only ever returning Task.CompletedTask",
                """
                    public class MyTaskEndHandler(ILogger<MyTaskEndHandler> logger) : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance)
                        {
                            if (taskId == "Task_2" || taskId == "Task_2Revisor")
                            {
                                logger.LogInformation("Missing scope for task {TaskId} of {InstanceId}", taskId, instance.Id);
                            }
                            return Task.CompletedTask;
                        }
                    }
                    """,
                $$"""
                    public class MyTaskEndHandler(ILogger<MyTaskEndHandler> logger) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => taskId == "Task_2" || taskId == "Task_2Revisor";

                        public Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            Instance instance = context.InstanceDataMutator.Instance;
                            if (taskId == "Task_2" || taskId == "Task_2Revisor")
                            {
                                logger.LogInformation("Missing scope for task {TaskId} of {InstanceId}", taskId, instance.Id);
                            }
                            return Task.FromResult<{{HandlerResult}}>({{HandlerResult}}.Success());
                        }
                    }
                    """
            },
            {
                "not async, returning another task",
                """
                    public class Starter : IProcessTaskStart
                    {
                        public Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                        {
                            if (taskId == "Task_2")
                                return Task.CompletedTask;
                            return Prepare(instance);
                        }

                        private static Task Prepare(Instance instance) => Task.CompletedTask;
                    }
                    """,
                $$"""
                    public class Starter : {{IOnTaskStartingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskStartingContext}} context)
                        {
                            string taskId = context.TaskId;
                            Instance instance = context.InstanceDataMutator.Instance;
                            if (taskId == "Task_2")
                                return {{HandlerResult}}.Success();
                            await Prepare(instance);
                            return {{HandlerResult}}.Success();
                        }

                        private static Task Prepare(Instance instance) => Task.CompletedTask;
                    }
                    """
            },
            {
                "a return of another task inside a condition",
                """
                    public class Starter : IProcessTaskStart
                    {
                        public Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                        {
                            if (taskId == "Task_2") return Prepare(instance);
                            return Task.CompletedTask;
                        }

                        private static Task Prepare(Instance instance) => Task.CompletedTask;
                    }
                    """,
                $$"""
                    public class Starter : {{IOnTaskStartingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => taskId == "Task_2";

                        public async Task<{{HandlerResult}}> Execute({{OnTaskStartingContext}} context)
                        {
                            string taskId = context.TaskId;
                            Instance instance = context.InstanceDataMutator.Instance;
                            if (taskId == "Task_2") { await Prepare(instance); return {{HandlerResult}}.Success(); }
                            return {{HandlerResult}}.Success();
                        }

                        private static Task Prepare(Instance instance) => Task.CompletedTask;
                    }
                    """
            },
            {
                "returning a conditional task, which await would bind tighter than",
                """
                    public class Hook : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance)
                        {
                            return taskId == "Task_1" ? Work(instance) : Task.CompletedTask;
                        }

                        private static Task Work(Instance instance) => Task.Delay(1);
                    }
                    """,
                $$"""
                    public class Hook : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            Instance instance = context.InstanceDataMutator.Instance;
                            await (taskId == "Task_1" ? Work(instance) : Task.CompletedTask);
                            return {{HandlerResult}}.Success();
                        }

                        private static Task Work(Instance instance) => Task.Delay(1);
                    }
                    """
            },
            {
                "an expression body with ??, which await would bind tighter than",
                """
                    public class Hook(Func<Task>? work) : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance) => work?.Invoke() ?? Task.CompletedTask;
                    }
                    """,
                $$"""
                    public class Hook(Func<Task>? work) : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            await (work?.Invoke() ?? Task.CompletedTask);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                "an expression body that throws",
                """
                    public class Abandoned : IProcessTaskAbandon
                    {
                        public Task Abandon(string taskId, Instance instance) => throw new NotSupportedException("Not abandoned");
                    }
                    """,
                $$"""
                    public class Abandoned : {{IOnTaskAbandoningHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public Task<{{HandlerResult}}> Execute({{OnTaskAbandoningContext}} context) => throw new NotSupportedException("Not abandoned");
                    }
                    """
            },
            {
                "an expression body returning Task.CompletedTask",
                """
                    public class Abandoned : IProcessTaskAbandon
                    {
                        public Task Abandon(string taskId, Instance instance) => Task.CompletedTask;
                    }
                    """,
                $$"""
                    public class Abandoned : {{IOnTaskAbandoningHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => false;

                        public Task<{{HandlerResult}}> Execute({{OnTaskAbandoningContext}} context) => Task.FromResult<{{HandlerResult}}>({{HandlerResult}}.Success());
                    }
                    """
            },
            {
                "an async expression body",
                """
                    public class ProcessTaskEnd : IProcessTaskEnd
                    {
                        public async Task End(string taskId, Instance instance) => await Archive(instance);

                        private static Task Archive(Instance instance) => Task.CompletedTask;
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => true;

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            Instance instance = context.InstanceDataMutator.Instance;
                            await Archive(instance);
                            return {{HandlerResult}}.Success();
                        }

                        private static Task Archive(Instance instance) => Task.CompletedTask;
                    }
                    """
            },
            {
                "an explicit implementation",
                """
                    public class ProcessTaskEnd : IProcessTaskEnd
                    {
                        async Task IProcessTaskEnd.End(string taskId, Instance instance)
                        {
                            if (taskId == "Task_1")
                            {
                                await Task.Delay(1);
                            }
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

                        async Task<{{HandlerResult}}> {{IOnTaskEndingHandler}}.Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            if (taskId == "Task_1")
                            {
                                await Task.Delay(1);
                            }
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                "parameters named otherwise, and a field named context",
                """
                    public class ProcessTaskEnd : IProcessTaskEnd
                    {
                        private readonly object context = new();

                        public async Task End(string elementId, Instance _)
                        {
                            if (elementId == "Task_1")
                            {
                                lock (context) { }
                                await Task.Delay(1);
                            }
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        private readonly object context = new();

                        public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} hookContext)
                        {
                            string elementId = hookContext.TaskId;
                            if (elementId == "Task_1")
                            {
                                lock (context) { }
                                await Task.Delay(1);
                            }
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                // hdir hego-* apps spell the task type out, since a model class of theirs is named Task.
                "Task written with its namespace",
                """
                    public class ProcessTaskEnd : IProcessTaskEnd
                    {
                        public async System.Threading.Tasks.Task End(string taskId, Instance instance)
                        {
                            if (taskId.Equals("Task_1", StringComparison.InvariantCulture))
                            {
                                await System.Threading.Tasks.Task.Delay(1);
                            }
                        }
                    }
                    """,
                $$"""
                    public class ProcessTaskEnd : {{IOnTaskEndingHandler}}
                    {
                        public bool ShouldRunForTask(string taskId) => taskId == "Task_1";

                        public async System.Threading.Tasks.Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            if (taskId.Equals("Task_1", StringComparison.InvariantCulture))
                            {
                                await System.Threading.Tasks.Task.Delay(1);
                            }
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
            {
                "a class with two task hooks, which needs a filter per interface",
                """
                    public class Lifecycle : IProcessTaskStart, IProcessTaskEnd
                    {
                        public async Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                        {
                            if (taskId != "Task_1") return;
                            await Task.Delay(1);
                        }

                        public async Task End(string taskId, Instance instance)
                        {
                            if (taskId != "Task_2") return;
                            await Task.Delay(2);
                        }
                    }
                    """,
                $$"""
                    public class Lifecycle : {{IOnTaskStartingHandler}}, {{IOnTaskEndingHandler}}
                    {
                        bool {{IOnTaskStartingHandler}}.ShouldRunForTask(string taskId) => taskId == "Task_1";

                        public async Task<{{HandlerResult}}> Execute({{OnTaskStartingContext}} context)
                        {
                            string taskId = context.TaskId;
                            if (taskId != "Task_1") return {{HandlerResult}}.Success();
                            await Task.Delay(1);
                            return {{HandlerResult}}.Success();
                        }

                        bool {{IOnTaskEndingHandler}}.ShouldRunForTask(string taskId) => taskId == "Task_2";

                        public async Task<{{HandlerResult}}> Execute({{OnTaskEndingContext}} context)
                        {
                            string taskId = context.TaskId;
                            if (taskId != "Task_2") return {{HandlerResult}}.Success();
                            await Task.Delay(2);
                            return {{HandlerResult}}.Success();
                        }
                    }
                    """
            },
        };

    [Theory]
    [MemberData(nameof(Ported))]
    public void PortsTheHook(string label, string before, string after)
    {
        _ = label;
        _app.Write(HookPath, InApp(before));

        Port(AppFolder);

        Assert.Equal(InApp(after), _app.Read(HookPath));
        AssertCompilesAgainstV9(AppFolder);
    }

    public static TheoryData<string, string, string, string> Blocked =>
        new()
        {
            {
                "partial class",
                """
                    public partial class Hook : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance) => Task.CompletedTask;
                    }

                    public partial class Hook { }
                    """,
                "Hook",
                "the class is partial"
            },
            {
                "virtual method",
                """
                    public class Hook : IProcessTaskEnd
                    {
                        public virtual Task End(string taskId, Instance instance) => Task.CompletedTask;
                    }
                    """,
                "Hook",
                "it overrides or is overridden"
            },
            {
                "a member named Execute",
                """
                    public class Hook : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance) => Execute(instance);

                        public Task Execute(Instance instance) => Task.CompletedTask;
                    }
                    """,
                "Hook",
                "it already has a member named Execute"
            },
            {
                "a member named ShouldRunForTask",
                """
                    public class Hook : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance) => Task.CompletedTask;

                        public static bool ShouldRunForTask(string taskId) => true;
                    }
                    """,
                "Hook",
                "it already has a member named ShouldRunForTask"
            },
            {
                // brg/signeringsoppgave-sorm App/services/VarslingService.cs:13.
                "reading prefill",
                """
                    public class VarslingService : IProcessTaskStart
                    {
                        public Task Start(string taskId, Instance instance, Dictionary<string, string>? prefill)
                        {
                            prefill?.TryGetValue("melding.varsling.navn", out string? utfyllerNavn);
                            return Task.CompletedTask;
                        }
                    }
                    """,
                "VarslingService",
                "it reads prefill, which v9 does not pass to task start; use IInstantiationProcessor.DataCreation, which gets it"
            },
            {
                "the interface through another interface",
                """
                    public interface IMyHook : IProcessTaskEnd { }

                    public class Hook : IMyHook
                    {
                        public Task End(string taskId, Instance instance) => Task.CompletedTask;
                    }
                    """,
                "Hook",
                "it gets IProcessTaskEnd from another type, which must change with it"
            },
            {
                "called by the app",
                """
                    public class Hook : IProcessTaskEnd
                    {
                        public Task End(string taskId, Instance instance) => Task.CompletedTask;
                    }

                    public class Caller
                    {
                        public Task Call(Instance instance) => new Hook().End("Task_1", instance);
                    }
                    """,
                "Hook",
                "the app calls it at logic/Hook.cs:{call}"
            },
            {
                // dat/forhandsmelding's DataModelCleanUp, a subclass of an Arbeidstilsynet package class.
                "inherited from a package",
                """
                    public class DataModelCleanUp : Dibk.Ftpb.Common.AltinnApps.PreSubmitDataModelProcessor
                    {
                        protected override Task ProcessDataModel(Instance instance) => Task.CompletedTask;
                    }
                    """,
                "DataModelCleanUp",
                "it is declared in a package"
            },
            {
                "Task written through an alias",
                """
                    public class Hook : IProcessTaskEnd
                    {
                        public Job End(string taskId, Instance instance) => Job.CompletedTask;
                    }
                    """,
                "Hook",
                "its return type is not written as Task"
            },
        };

    [Theory]
    [MemberData(nameof(Blocked))]
    public void ReportsWhyAHookWasNotPorted(string label, string source, string type, string reason)
    {
        _ = label;
        var text = InApp(source)
            .Replace(
                "namespace App.Logic;",
                "namespace App.Logic;\n\nusing Job = System.Threading.Tasks.Task;",
                StringComparison.Ordinal
            );
        _app.Write(HookPath, text);
        var (v8, v9) = source.Contains("IProcessTaskStart", StringComparison.Ordinal)
            ? ("IProcessTaskStart", "IOnTaskStartingHandler")
            : ("IProcessTaskEnd", "IOnTaskEndingHandler");

        var result = Port(AppFolder, Package);

        var because = reason.Contains("{call}", StringComparison.Ordinal)
            ? reason.Replace("{call}", $"{LineOf(text, "new Hook().End(")}", StringComparison.Ordinal)
            : reason;
        Assert.Equal(
            [
                Todo(
                    $"{HookPath}:{LineOf(text, $"class {type}")}: {type} implements {v8}, which v9 removed, and was not "
                        + $"ported: {because}. Move the code to {v9}: ShouldRunForTask(taskId) and Execute(context), "
                        + "with instance data from context.InstanceDataMutator."
                ),
            ],
            result.Messages
        );
        Assert.Equal(text, _app.Read(HookPath));
    }

    [Fact]
    public void APortedHook_IsReportedWithTheWarningThatV9RunsItAgain()
    {
        var source = InApp(
            """
            public class Hook : IProcessTaskEnd
            {
                public Task End(string taskId, Instance instance) => Task.CompletedTask;
            }
            """
        );
        _app.Write(HookPath, source);
        _app.Write("Program.cs", Program("services.AddTransient<IProcessTaskEnd, Hook>();"));

        var result = Port(AppFolder);

        Assert.Equal(
            [
                Warning("Program.cs:11: registered Hook as IOnTaskEndingHandler."),
                Ported($"{HookPath}:{LineOf(source, "public class Hook")}", "Hook", "IOnTaskEndingHandler"),
            ],
            result.Messages
        );
    }

    [Fact]
    public void AThrowInAPortedHook_IsReportedWhereItThrows()
    {
        // skd/formueinntekt-skattemelding-v2 App/logic/TaskProcessing/MyTaskEndHandler.cs:23.
        var source = InApp(
            """
            public class MyTaskEndHandler : IProcessTaskEnd
            {
                public Task End(string taskId, Instance instance)
                {
                    if (taskId == "Task_2" && instance.Id.Length == 0)
                    {
                        throw new InvalidOperationException("User must be authenticated through ID-porten");
                    }
                    Func<Task> later = () => throw new InvalidOperationException("not the hook's own throw");
                    return Task.CompletedTask;
                }
            }
            """
        );
        _app.Write(HookPath, source);
        _app.Write("Program.cs", Program("services.AddTransient<IProcessTaskEnd, MyTaskEndHandler>();"));

        var result = Port(AppFolder);

        Assert.Equal(
            [
                $"{HookPath}:{LineOf(source, "throw new")}: MyTaskEndHandler throws here, and v9 retries a hook that "
                    + "throws, so the process transition is tried again. If trying again cannot help, return "
                    + "HandlerResult.FailedPermanent(message) instead.",
            ],
            result.Warnings.Where(static warning => warning.Contains("throws", StringComparison.Ordinal))
        );
    }
}
