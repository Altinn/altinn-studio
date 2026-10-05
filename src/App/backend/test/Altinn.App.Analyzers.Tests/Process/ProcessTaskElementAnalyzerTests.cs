using System.Collections.Immutable;
using System.Diagnostics.CodeAnalysis;
using Altinn.App.Analyzers.Tests.Fixtures;
using Altinn.App.Core.Features.Process;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.Analyzers.Tests.Process;

/// <summary>
/// Runs <see cref="ProcessTaskElementAnalyzer"/> over an app compiled in memory against Altinn.App.Core, to show
/// which of the app's own task classes it can classify. The BPMN side is covered by
/// <see cref="ProcessTaskElementUtilsTests"/>.
/// </summary>
public class ProcessTaskElementAnalyzerTests
{
    private const string ProcessPath = "/repo/App/config/process/process.bpmn";

    private const string Usings = """
        using System.Threading.Tasks;
        using Altinn.App.Core.Features.Process;
        using Altinn.App.Core.Internal.Process.ProcessTasks;

        """;

    [Fact]
    public async Task Reports_The_Apps_Own_Tasks_On_The_Wrong_Element()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class FetchNote : IServiceTask
                {
                    public string Type => "fetchNote";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public sealed class Archive : IPipelineServiceTask
                {
                    public const string TaskType = "archive";
                    public string Type => TaskType;
                    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) => throw new System.NotImplementedException();
                }

                public sealed class Review : IProcessTask
                {
                    public string Type { get { return "review"; } }
                }
                """,
            Process(
                Element("task", "Task_FetchNote", "fetchNote"),
                Element("task", "Task_Archive", "archive"),
                Element("serviceTask", "Task_Review", "review")
            )
        );

        Assert.Equal(
            ["Task_FetchNote", "Task_Archive", "Task_Review"],
            diagnostics.Select(d => d.GetMessage().Split('\'')[1])
        );
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Matched_Elements_Are_Valid()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class FetchNote : IServiceTask
                {
                    public string Type => "fetchNote";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }
                """,
            Process(Element("serviceTask", "Task_FetchNote", "fetchNote"), Element("serviceTask", "Task_Pdf", "pdf"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Type_That_Is_Not_A_Constant_Is_Not_Reported()
    {
        // The startup check sees the computed value; the analyzer cannot prove what it is.
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class FetchNote : IServiceTask
                {
                    private readonly string _type = "fetchNote";
                    public string Type => _type;
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public sealed class Lookup : IServiceTask
                {
                    public string Type
                    {
                        get
                        {
                            var type = "lookup";
                            return type;
                        }
                    }
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public sealed class Initialized : IServiceTask
                {
                    public string Type { get; } = "initialized";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }
                """,
            Process(
                Element("task", "Task_FetchNote", "fetchNote"),
                Element("task", "Task_Lookup", "lookup"),
                Element("task", "Task_Initialized", "initialized")
            )
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Explicit_And_Inherited_Type_Implementations_Are_Read()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class Explicit : IServiceTask
                {
                    string IProcessTask.Type => "explicit";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public abstract class TaskBase : IServiceTask
                {
                    public string Type => "inherited";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public sealed class Inherited : TaskBase { }
                """,
            Process(Element("task", "Task_Explicit", "explicit"), Element("task", "Task_Inherited", "inherited"))
        );

        Assert.Equal(["Task_Explicit", "Task_Inherited"], diagnostics.Select(d => d.GetMessage().Split('\'')[1]));
    }

    [Theory]
    [InlineData("data")]
    [InlineData("baseType")]
    public async Task An_Overridden_Type_Is_Read_From_The_Most_Derived_Override(string baseType)
    {
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public abstract class Base : IServiceTask
                {
                    public virtual string Type => "{{baseType}}";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public sealed class Derived : Base
                {
                    public override string Type => "custom";
                }
                """,
            Process(Element("task", "Task_Base", baseType), Element("task", "Task_Custom", "custom"))
        );

        Assert.Equal(["Task_Custom"], diagnostics.Select(d => d.GetMessage().Split('\'')[1]));
    }

    [Fact]
    public async Task An_Override_That_Is_Not_A_Constant_Hides_The_Base_Constant()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public abstract class Base : IServiceTask
                {
                    public virtual string Type => "baseType";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public sealed class Derived : Base
                {
                    private readonly string _type = "computed";
                    public override string Type => _type;
                }
                """,
            Process(Element("task", "Task_Base", "baseType"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task An_Abstract_Class_Is_Not_A_Task_Of_Its_Own()
    {
        // Only a concrete class can be registered, so an abstract one with no subclass contributes no type.
        var diagnostics = await Analyze(
            Usings
                + """
                public abstract class AbstractOnly : IServiceTask
                {
                    public string Type => "abstractOnly";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }
                """,
            Process(Element("task", "Task_AbstractOnly", "abstractOnly"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Type_Inherited_From_A_Generic_Base_Is_Read()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public abstract class Generic<T> : IServiceTask
                {
                    public string Type => "generic";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public sealed class Closed : Generic<int> { }
                """,
            Process(Element("task", "Task_Generic", "generic"))
        );

        Assert.Equal(["Task_Generic"], diagnostics.Select(d => d.GetMessage().Split('\'')[1]));
    }

    [Fact]
    public async Task An_App_Class_Named_Like_A_Built_In_Type_Is_Ignored()
    {
        // The class may be dead code that is never registered, so 'data' stays a process task.
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class DeadCode : IServiceTask
                {
                    public string Type => "data";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }
                """,
            Process(Element("task", "Task_Data", "data"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Service_Task_Wins_Over_A_Process_Task_Of_The_Same_Type()
    {
        // The runtime resolves service tasks first, so drawing 'shared' as a service task is right.
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class SharedService : IServiceTask
                {
                    public string Type => "shared";
                    public Task<ServiceTaskResult> Execute(ServiceTaskContext context) => throw new System.NotImplementedException();
                }

                public sealed class SharedProcess : IProcessTask
                {
                    public string Type => "shared";
                }
                """,
            Process(Element("serviceTask", "Task_Shared", "shared"))
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Built_In_Types_Are_Checked_Without_Any_Task_Classes()
    {
        var diagnostics = await Analyze("public sealed class Empty { }", Process(Element("task", "Task_Pdf", "pdf")));

        Assert.Equal("ALTINNAPP1003", Assert.Single(diagnostics).Id);
    }

    [Fact]
    public async Task Projects_That_Are_Not_Apps_Are_Not_Analyzed()
    {
        var diagnostics = await Analyze(
            "public sealed class Empty { }",
            Process(Element("task", "Task_Pdf", "pdf")),
            isAltinnApp: false
        );

        Assert.Empty(diagnostics);
    }

    private static async Task<ImmutableArray<Diagnostic>> Analyze(
        string source,
        string process,
        bool isAltinnApp = true
    )
    {
        var references = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location))
            .Append(typeof(IServiceTask).Assembly)
            .Distinct()
            .Select(assembly => MetadataReference.CreateFromFile(assembly.Location));

        var compilation = CSharpCompilation.Create(
            "App",
            [CSharpSyntaxTree.ParseText(source, path: "/repo/App/Tasks.cs")],
            references,
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                nullableContextOptions: NullableContextOptions.Enable
            )
        );
        Assert.Empty(compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));

        var options = new AnalyzerOptions(
            [new InMemoryAdditionalText(ProcessPath, process)],
            new AltinnAppOptionsProvider(isAltinnApp)
        );
        return await compilation
            .WithAnalyzers([new ProcessTaskElementAnalyzer()], options)
            .GetAnalyzerDiagnosticsAsync(CancellationToken.None);
    }

    private static string Element(string element, string id, string taskType) =>
        $"""
                <bpmn:{element} id="{id}">
                  <bpmn:extensionElements>
                    <altinn:taskExtension>
                      <altinn:taskType>{taskType}</altinn:taskType>
                    </altinn:taskExtension>
                  </bpmn:extensionElements>
                </bpmn:{element}>

            """;

    private static string Process(params string[] tasks) =>
        $"""
            <?xml version="1.0" encoding="UTF-8"?>
            <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:altinn="http://altinn.no/process" id="Definitions_1">
              <bpmn:process id="Altinn_Process_Definition" isExecutable="true">
                <bpmn:startEvent id="StartEvent_1" />
            {string.Concat(tasks)}    <bpmn:endEvent id="EndEvent_1" />
              </bpmn:process>
            </bpmn:definitions>
            """;

    private sealed class AltinnAppOptionsProvider(bool isAltinnApp) : AnalyzerConfigOptionsProvider
    {
        private readonly Options _options = new(isAltinnApp);

        public override AnalyzerConfigOptions GlobalOptions => _options;

        public override AnalyzerConfigOptions GetOptions(SyntaxTree tree) => _options;

        public override AnalyzerConfigOptions GetOptions(AdditionalText textFile) => _options;

        private sealed class Options(bool isAltinnApp) : AnalyzerConfigOptions
        {
            public override bool TryGetValue(string key, [NotNullWhen(true)] out string? value)
            {
                value = isAltinnApp && key == "build_property.IsAltinnApp" ? "true" : null;
                return value is not null;
            }
        }
    }
}
