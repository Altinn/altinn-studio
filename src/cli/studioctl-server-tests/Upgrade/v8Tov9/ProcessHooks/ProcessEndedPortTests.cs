using static Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks.ProcessHookStubs;

namespace Studioctl.Tests.Upgrade.v8Tov9.ProcessHooks;

/// <summary>
/// An <c>IProcessEnd</c> becomes an <c>IOnProcessEndedHandler</c>, which has no task filter and gets no events.
/// </summary>
public sealed class ProcessEndedPortTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    [Fact]
    public void AProcessEndHook_BecomesAnOnProcessEndedHandler()
    {
        // nkr/fastregnskapsrapportering App/logic/TaskProcessors/ProcessEnd.cs:18, its Storage calls left out.
        _app.Write(
            "logic/ProcessEnd.cs",
            InApp(
                """
                public class ProcessEnd(ILogger<ProcessEnd> logger) : IProcessEnd
                {
                    public async Task End(Instance instance, List<InstanceEvent> events)
                    {
                        logger.LogInformation("Process ended for {InstanceId}", instance.Id);
                        await Task.CompletedTask;
                    }
                }
                """
            )
        );
        _app.Write("Program.cs", Program("services.AddTransient<IProcessEnd, ProcessEnd>();"));

        Port(AppFolder);

        Assert.Equal(
            InApp(
                $$"""
                public class ProcessEnd(ILogger<ProcessEnd> logger) : {{IOnProcessEndedHandler}}
                {
                    public async Task<{{HandlerResult}}> Execute({{OnProcessEndedContext}} context)
                    {
                        Instance instance = context.InstanceDataMutator.Instance;
                        logger.LogInformation("Process ended for {InstanceId}", instance.Id);
                        await Task.CompletedTask;
                        return {{HandlerResult}}.Success();
                    }
                }
                """
            ),
            _app.Read("logic/ProcessEnd.cs")
        );
        Assert.Equal(
            Program($"services.AddTransient<{IOnProcessEndedHandler}, ProcessEnd>();"),
            _app.Read("Program.cs")
        );
        AssertCompilesAgainstV9(AppFolder);
    }

    [Fact]
    public void AProcessEndHookThatReadsTheEvents_IsATodo()
    {
        var source = InApp(
            """
            public class ProcessEnd : IProcessEnd
            {
                public Task End(Instance instance, List<InstanceEvent>? events) => Task.Delay(events?.Count ?? 0);
            }
            """
        );
        _app.Write("logic/ProcessEnd.cs", source);

        var result = Port(AppFolder);

        Assert.Equal(
            [
                Todo(
                    $"logic/ProcessEnd.cs:{LineOf(source, "public class")}: ProcessEnd implements IProcessEnd, which v9 "
                        + "removed, and was not ported: it reads events, which v9 does not pass; read "
                        + "context.InstanceDataMutator.Instance.Process. Move the code to IOnProcessEndedHandler: "
                        + "Execute(context), with instance data from context.InstanceDataMutator."
                ),
            ],
            result.Messages
        );
        Assert.Equal(source, _app.Read("logic/ProcessEnd.cs"));
    }
}
