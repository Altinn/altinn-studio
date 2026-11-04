using System.Collections.Immutable;
using System.Reflection;
using Altinn.App.Analyzers.Tests.Fixtures;
using Altinn.App.Core.Features.Process;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Analyzers.Tests.Process;

/// <summary>
/// Runs <see cref="ProcessHookAnalyzer"/> over an app compiled in memory against Altinn.App.Core, with the hooks it
/// registers and a process with the tasks <c>Task_1</c>, <c>Task_2</c> and <c>Task_3</c>.
/// </summary>
public class ProcessHookAnalyzerTests
{
    private const string ProcessPath = "/repo/App/config/process/process.bpmn";
    private const string Starting = nameof(IOnTaskStartingHandler);
    private const string Ending = nameof(IOnTaskEndingHandler);
    private const string Abandoning = nameof(IOnTaskAbandoningHandler);

    private const string Prelude = """
        using System;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features.Process;
        using Microsoft.Extensions.DependencyInjection;
        using Microsoft.Extensions.DependencyInjection.Extensions;

        public static class TaskIds
        {
            public const string First = "Task_1";
        }

        """;

    [Fact]
    public async Task Reports_Each_Rule()
    {
        var diagnostics = await Analyze(
            TaskHook("Everywhere", "=> true;")
                + TaskHook("FirstTaskOnly", "=> taskId == \"Task_1\";")
                + TaskHook("Misspelled", "=> taskId == \"Task_l\";", Ending)
                + ProcessEndedHook("Archive")
                + ProcessEndedHook("Notify")
                + Registrations(
                    "services.AddTransient<IOnTaskStartingHandler, Everywhere>();",
                    "services.AddTransient<IOnTaskStartingHandler, FirstTaskOnly>();",
                    "services.AddTransient<IOnTaskEndingHandler, Misspelled>();",
                    "services.AddTransient<IOnProcessEndedHandler, Archive>();",
                    "services.AddTransient<IOnProcessEndedHandler, Notify>();"
                )
        );

        Assert.Equal(["ALTINNAPP1029", "ALTINNAPP1027", "ALTINNAPP1028"], diagnostics.Select(d => d.Id));
        await Verify(diagnostics);
    }

    [Theory]
    [InlineData("=> taskId == \"Task_1\";", "Task_1")]
    [InlineData("=> \"Task_1\" == taskId;", "Task_1")]
    [InlineData("=> taskId == TaskIds.First;", "Task_1")]
    [InlineData("{ return taskId == \"Task_1\"; }", "Task_1")]
    [InlineData("=> taskId is \"Task_1\" or \"Task_3\";", "Task_1,Task_3")]
    [InlineData("=> taskId is not (\"Task_1\" or \"Task_2\");", "Task_3")]
    [InlineData("=> string.Equals(taskId, \"Task_1\");", "Task_1")]
    [InlineData("=> taskId.Equals(\"Task_1\");", "Task_1")]
    [InlineData("=> string.Equals(taskId, \"Task_1\", StringComparison.Ordinal);", "Task_1")]
    [InlineData("=> taskId != \"Task_2\";", "Task_1,Task_3")]
    [InlineData("=> !(taskId == \"Task_1\");", "Task_2,Task_3")]
    [InlineData("=> taskId == \"Task_1\" || taskId == \"Task_3\";", "Task_1,Task_3")]
    [InlineData("=> taskId != \"Task_1\" && taskId != \"Task_3\";", "Task_2")]
    [InlineData("=> false;", "")]
    public async Task Reduces_Each_Supported_Body(string shouldRunForTask, string expectedTasks)
    {
        var diagnostics = await Analyze(
            TaskHook("Everywhere", "=> true;")
                + TaskHook("Second", shouldRunForTask)
                + Registrations(
                    "services.AddTransient<IOnTaskStartingHandler, Everywhere>();",
                    "services.AddTransient<IOnTaskStartingHandler, Second>();"
                )
        );

        Assert.Equal(expectedTasks, string.Join(",", OverlappingTasks(diagnostics)));
        Assert.All(diagnostics, d => Assert.Equal("ALTINNAPP1027", d.Id));
    }

    [Theory]
    [InlineData("=> _enabled;")]
    [InlineData("=> Array.IndexOf(_tasks, taskId) >= 0;")]
    [InlineData("=> taskId.StartsWith(\"Task_1\");")]
    [InlineData("=> taskId == \"Task_1\" && _enabled;")]
    [InlineData("=> taskId switch { \"Task_1\" => true, _ => false };")]
    [InlineData("=> string.Equals(taskId, \"Task_1\", StringComparison.OrdinalIgnoreCase);")]
    [InlineData("=> (object)taskId == \"Task_1\";")]
    [InlineData("{ var id = taskId; return id == \"Task_1\"; }")]
    [InlineData("=> taskId == \"Task_9\" && _enabled;")]
    public async Task Skips_Bodies_It_Cannot_Reduce(string shouldRunForTask)
    {
        // The second hook may well run for Task_1 too, but nothing the analyzer can read says so.
        var diagnostics = await Analyze(
            TaskHook("Everywhere", "=> true;")
                + TaskHook("Second", shouldRunForTask)
                + Registrations(
                    "services.AddTransient<IOnTaskStartingHandler, Everywhere>();",
                    "services.AddTransient<IOnTaskStartingHandler, Second>();"
                )
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Hooks_Of_Different_Kinds_Run_Together()
    {
        var diagnostics = await Analyze(
            TaskHook("Start", "=> true;")
                + TaskHook("End", "=> true;", Ending)
                + TaskHook("Abandon", "=> true;", Abandoning)
                + Registrations(
                    "services.AddTransient<IOnTaskStartingHandler, Start>();",
                    "services.AddTransient<IOnTaskEndingHandler, End>();",
                    "services.AddTransient<IOnTaskAbandoningHandler, Abandon>();"
                )
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Class_That_Is_Not_Registered_Does_Not_Count()
    {
        // Nothing scans for hooks, so the unregistered class never runs, and its misspelled id does not matter.
        var diagnostics = await Analyze(
            TaskHook("Registered", "=> true;")
                + TaskHook("Unregistered", "=> taskId is \"Task_1\" or \"Task_l\";")
                + ProcessEndedHook("Archive")
                + ProcessEndedHook("UnregisteredArchive")
                + Registrations(
                    "services.AddTransient<IOnTaskStartingHandler, Registered>();",
                    "services.AddTransient<IOnProcessEndedHandler, Archive>();"
                )
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Class_Registered_Twice_Counts_Twice()
    {
        // The service provider returns an instance per registration, and both run.
        var diagnostics = await Analyze(
            TaskHook("FirstTaskOnly", "=> taskId == \"Task_1\";")
                + Registrations(
                    "services.AddTransient<IOnTaskStartingHandler, FirstTaskOnly>();",
                    "services.AddScoped<IOnTaskStartingHandler, FirstTaskOnly>();"
                )
        );

        Assert.Equal(["Task_1"], OverlappingTasks(diagnostics));
        Assert.Contains("FirstTaskOnly, FirstTaskOnly", Assert.Single(diagnostics).GetMessage());
    }

    [Theory]
    [InlineData("services.AddScoped<IOnTaskStartingHandler, Second>();")]
    [InlineData("services.AddSingleton<IOnTaskStartingHandler>(new Second());")]
    [InlineData("services.AddTransient<IOnTaskStartingHandler>(sp => new Second());")]
    [InlineData("services.AddSingleton<IOnTaskStartingHandler, Second>(sp => new Second());")]
    [InlineData("services.AddTransient(typeof(IOnTaskStartingHandler), typeof(Second));")]
    [InlineData("services.AddTransient(typeof(IOnTaskStartingHandler), sp => new Second());")]
    [InlineData("ServiceCollectionServiceExtensions.AddTransient<IOnTaskStartingHandler, Second>(services);")]
    [InlineData("services.AddTransient<Unrelated>().AddTransient<IOnTaskStartingHandler, Second>();")]
    [InlineData("try { services.AddTransient<IOnTaskStartingHandler, Second>(); } finally { }")]
    public async Task Reads_Each_Registration_Form(string registration)
    {
        var diagnostics = await Analyze(
            TaskHook("Everywhere", "=> true;")
                + TaskHook("Second", "=> taskId == \"Task_1\";")
                + "public sealed class Unrelated { }\n"
                + Registrations("services.AddTransient<IOnTaskStartingHandler, Everywhere>();", registration)
        );

        Assert.Equal(["Task_1"], OverlappingTasks(diagnostics));
    }

    [Theory]
    [InlineData("if (enabled) services.AddTransient<IOnTaskStartingHandler, Second>();")]
    [InlineData("if (enabled) { } else { services.AddTransient<IOnTaskStartingHandler, Second>(); }")]
    [InlineData("foreach (var _ in new[] { 1 }) services.AddTransient<IOnTaskStartingHandler, Second>();")]
    [InlineData("try { } catch { services.AddTransient<IOnTaskStartingHandler, Second>(); }")]
    [InlineData("_ = enabled ? services.AddTransient<IOnTaskStartingHandler, Second>() : services;")]
    [InlineData("Action register = () => services.AddTransient<IOnTaskStartingHandler, Second>(); register();")]
    [InlineData("services.AddTransient<IOnTaskStartingHandler>(sp => sp.GetRequiredService<Second>());")]
    [InlineData("services.TryAddTransient<IOnTaskStartingHandler, Second>();")]
    [InlineData("services.TryAddEnumerable(ServiceDescriptor.Transient<IOnTaskStartingHandler, Second>());")]
    [InlineData("services.AddKeyedTransient<IOnTaskStartingHandler, Second>(\"key\");")]
    [InlineData(
        "void Add<T>() where T : class, IOnTaskStartingHandler => services.AddTransient<IOnTaskStartingHandler, T>(); Add<Second>();"
    )]
    public async Task Skips_Registrations_It_Cannot_Count(string registration)
    {
        var diagnostics = await Analyze(
            TaskHook("Everywhere", "=> true;")
                + TaskHook("Second", "=> taskId == \"Task_1\";")
                + Registrations("services.AddTransient<IOnTaskStartingHandler, Everywhere>();", registration)
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Local_Function_Registers_Like_A_Method()
    {
        // Program.cs registers in the local function RegisterCustomAppServices.
        var diagnostics = await Analyze(
            TaskHook("Everywhere", "=> true;")
                + TaskHook("Second", "=> taskId == \"Task_1\";")
                + Registrations(
                    """
                    void RegisterCustomAppServices(IServiceCollection appServices)
                    {
                        appServices.AddTransient<IOnTaskStartingHandler, Everywhere>();
                        appServices.AddTransient<IOnTaskStartingHandler, Second>();
                    }
                    RegisterCustomAppServices(services);
                    """
                )
        );

        Assert.Equal(["Task_1"], OverlappingTasks(diagnostics));
    }

    [Fact]
    public async Task The_Most_Derived_Or_Explicit_ShouldRunForTask_Is_Read()
    {
        var diagnostics = await Analyze(
            TaskHook("Everywhere", "=> true;")
                + """
                public abstract class HookBase : IOnTaskStartingHandler
                {
                    public virtual bool ShouldRunForTask(string taskId) => true;
                    public Task<HandlerResult> Execute(OnTaskStartingContext context) => throw new NotImplementedException();
                }

                public sealed class Overriding : HookBase
                {
                    public override bool ShouldRunForTask(string taskId) => taskId == "Task_2";
                }

                public sealed class Explicit : IOnTaskEndingHandler
                {
                    bool IOnTaskEndingHandler.ShouldRunForTask(string taskId) => taskId == "Task_3";
                    public Task<HandlerResult> Execute(OnTaskEndingContext context) => throw new NotImplementedException();
                }

                """
                + TaskHook("EverywhereEnding", "=> true;", Ending)
                + Registrations(
                    "services.AddTransient<IOnTaskStartingHandler, Everywhere>();",
                    "services.AddTransient<IOnTaskStartingHandler, Overriding>();",
                    "services.AddTransient<IOnTaskEndingHandler, Explicit>();",
                    "services.AddTransient<IOnTaskEndingHandler, EverywhereEnding>();"
                )
        );

        Assert.Equal(["Task_2", "Task_3"], OverlappingTasks(diagnostics));
    }

    [Theory]
    [InlineData("services.AddTransient<IOnProcessEndedHandler, Notify>();", true)]
    [InlineData("services.AddTransient<IOnProcessEndedHandler, Archive>();", true)]
    [InlineData("services.AddSingleton<IOnProcessEndedHandler>(sp => sp.GetRequiredService<Notify>());", true)]
    [InlineData("if (enabled) services.AddTransient<IOnProcessEndedHandler, Notify>();", false)]
    [InlineData("services.AddTransient<Notify>();", false)]
    public async Task Counts_Process_Ended_Hooks_By_Registration(string registration, bool isError)
    {
        // The runtime counts them without creating them, so a factory counts even though its class is unknown.
        var diagnostics = await Analyze(
            ProcessEndedHook("Archive")
                + ProcessEndedHook("Notify")
                + Registrations("services.AddTransient<IOnProcessEndedHandler, Archive>();", registration)
        );

        string[] expected = isError ? ["ALTINNAPP1028"] : [];
        Assert.Equal(expected, diagnostics.Select(d => d.Id));
    }

    [Fact]
    public async Task Process_Ended_Hooks_Are_Checked_Without_A_Process()
    {
        var diagnostics = await Analyze(
            ProcessEndedHook("Archive")
                + ProcessEndedHook("Notify")
                + TaskHook("Everywhere", "=> true;")
                + TaskHook("Second", "=> true;")
                + Registrations(
                    "services.AddTransient<IOnProcessEndedHandler, Archive>();",
                    "services.AddTransient<IOnProcessEndedHandler, Notify>();",
                    "services.AddTransient<IOnTaskStartingHandler, Everywhere>();",
                    "services.AddTransient<IOnTaskStartingHandler, Second>();"
                ),
            process: null
        );

        Assert.Equal(["ALTINNAPP1028"], diagnostics.Select(d => d.Id));
    }

    [Fact]
    public async Task Warns_At_Each_Compared_Id_That_Is_Not_A_Task()
    {
        var diagnostics = await Analyze(
            TaskHook("Misspelled", "=> taskId is \"Task_1\" or \"EndEvent_1\" || taskId != \"Task_4\";")
                + Registrations("services.AddTransient<IOnTaskStartingHandler, Misspelled>();")
        );

        Assert.All(diagnostics, d => Assert.Equal("ALTINNAPP1029", d.Id));
        Assert.Equal(
            ["\"EndEvent_1\"", "\"Task_4\""],
            diagnostics.Select(d => d.Location.SourceTree?.GetText().ToString(d.Location.SourceSpan))
        );
        Assert.Contains("'EndEvent_1' is a <bpmn:endEvent> in process.bpmn, not a task", diagnostics[0].GetMessage());
    }

    [Fact]
    public async Task Projects_That_Are_Not_Apps_Are_Not_Analyzed()
    {
        var diagnostics = await Analyze(
            TaskHook("Everywhere", "=> true;")
                + TaskHook("Second", "=> true;")
                + Registrations(
                    "services.AddTransient<IOnTaskStartingHandler, Everywhere>();",
                    "services.AddTransient<IOnTaskStartingHandler, Second>();"
                ),
            isAltinnApp: false
        );

        Assert.Empty(diagnostics);
    }

    private static IEnumerable<string> OverlappingTasks(ImmutableArray<Diagnostic> diagnostics) =>
        diagnostics.Where(d => d.Id == "ALTINNAPP1027").Select(d => d.GetMessage().Split('\'')[1]);

    private static async Task<ImmutableArray<Diagnostic>> Analyze(
        string source,
        string? process = Process,
        bool isAltinnApp = true
    )
    {
        var references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Append(typeof(IOnTaskStartingHandler).Assembly)
            .Append(typeof(ServiceCollectionServiceExtensions).Assembly)
            // Where the factories' IServiceProvider is forwarded from.
            .Append(Assembly.Load("System.ComponentModel"))
            .Distinct()
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location));

        var compilation = CSharpCompilation.Create(
            "App",
            [CSharpSyntaxTree.ParseText(Prelude + source, path: "/repo/App/Hooks.cs")],
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                nullableContextOptions: NullableContextOptions.Enable
            )
        );
        Assert.Empty(compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));

        var options = new AnalyzerOptions(
            process is null ? [] : [new InMemoryAdditionalText(ProcessPath, process)],
            new AltinnAppOptionsProvider(isAltinnApp)
        );
        var diagnostics = await compilation
            .WithAnalyzers([new ProcessHookAnalyzer()], options)
            .GetAnalyzerDiagnosticsAsync(CancellationToken.None);
        return [.. diagnostics.OrderBy(d => d.Location.SourceSpan.Start).ThenBy(d => d.GetMessage())];
    }

    private static string TaskHook(string name, string shouldRunForTask, string hook = Starting) =>
        $$"""
            public sealed class {{name}} : {{hook}}
            {
                private readonly bool _enabled = true;
                private static readonly string[] _tasks = ["Task_1"];

                public bool ShouldRunForTask(string taskId) {{shouldRunForTask}}

                public Task<HandlerResult> Execute({{hook[1..^"Handler".Length]}}Context context) =>
                    throw new NotImplementedException();
            }

            """;

    private static string ProcessEndedHook(string name) =>
        $$"""
            public sealed class {{name}} : IOnProcessEndedHandler
            {
                public Task<HandlerResult> Execute(OnProcessEndedContext context) => throw new NotImplementedException();
            }

            """;

    private static string Registrations(params string[] statements) =>
        $$"""
            public static class Registrations
            {
                public static void Register(IServiceCollection services, bool enabled)
                {
                    {{string.Join("\n", statements)}}
                }
            }

            """;

    private const string Process = """
        <?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" id="Definitions_1">
          <bpmn:process id="Altinn_Process_Definition" isExecutable="true">
            <bpmn:startEvent id="StartEvent_1" />
            <bpmn:task id="Task_1" />
            <bpmn:task id="Task_2" />
            <bpmn:serviceTask id="Task_3" />
            <bpmn:endEvent id="EndEvent_1" />
          </bpmn:process>
        </bpmn:definitions>
        """;
}
