using System.Collections.Immutable;
using Altinn.App.Analyzers.Tests.Fixtures;
using Altinn.App.Core.Features.Process;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using Microsoft.CodeAnalysis.Diagnostics;

namespace Altinn.App.Analyzers.Tests.Process;

/// <summary>
/// Runs <see cref="ProcessTaskDefaultMemberAnalyzer"/> over task classes compiled in memory against Altinn.App.Core.
/// Each diagnostic is identified by the method its message names.
/// </summary>
public class ProcessTaskDefaultMemberAnalyzerTests
{
    private const string Usings = """
        using System.Collections.Generic;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features.Process;
        using Altinn.App.Core.Internal.Process.ProcessTasks;

        """;

    private const string ServiceTaskMembers = """
            public string Type => "task";
            public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
                throw new System.NotImplementedException();
        """;

    [Fact]
    public async Task Reports_A_Lifecycle_Method_That_Takes_The_Service_Task_Builder()
    {
        // The case that prompted the rule: it compiles, and its stage never runs.
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public sealed class FetchNote : IServiceTask
                {
                {{ServiceTaskMembers}}
                    public void DefineStart(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Prepare);
                    private Task<ServiceTaskResult> Prepare(StageContext context) => throw new System.NotImplementedException();
                }
                """
        );

        var diagnostic = Assert.Single(diagnostics);
        Assert.Equal("DefineStart", SourceAt(diagnostic));
        Assert.Equal(
            "'FetchNote.DefineStart(PipelineBuilder.ServiceTask)' does not implement "
                + "'IProcessTask.DefineStart(PipelineBuilder.Lifecycle)', so the runtime never calls it and runs the "
                + "default implementation instead. Declare it as 'public void DefineStart(PipelineBuilder.Lifecycle pipeline)'.",
            diagnostic.GetMessage()
        );
        await Verify(diagnostics);
    }

    [Fact]
    public async Task Reports_Each_Signature_That_Does_Not_Implement_Its_Member()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class WrongReturnType : IProcessTask
                {
                    public string Type => "wrongReturnType";
                    public Task DefineEnd(PipelineBuilder.Lifecycle pipeline) => Task.CompletedTask;
                }

                public sealed class NotPublic : IProcessTask
                {
                    public string Type => "notPublic";
                    void DefineAbandon(PipelineBuilder.Lifecycle pipeline) { }
                    internal void DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                }

                public sealed class Static : IProcessTask
                {
                    public string Type => "static";
                    public static void DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                }

                public sealed class WrongParameter : IProcessTask
                {
                    public string Type => "wrongParameter";
                    public IEnumerable<string> ValidateConfiguration(string context) => [];
                }

                public struct Struct : IProcessTask
                {
                    public string Type => "struct";
                    public void DefineEnd(PipelineBuilder.Lifecycle pipeline, int extra) { }
                }

                public abstract class AbstractTask : IProcessTask
                {
                    public string Type => "abstract";
                    public void DefineStart() { }
                }
                """
        );

        Assert.Equal(
            [
                "WrongReturnType.DefineEnd(PipelineBuilder.Lifecycle)",
                "NotPublic.DefineAbandon(PipelineBuilder.Lifecycle)",
                "NotPublic.DefineStart(PipelineBuilder.Lifecycle)",
                "Static.DefineStart(PipelineBuilder.Lifecycle)",
                "WrongParameter.ValidateConfiguration(string)",
                "Struct.DefineEnd(PipelineBuilder.Lifecycle, int)",
                "AbstractTask.DefineStart()",
            ],
            diagnostics.Select(ReportedMethod)
        );
        Assert.All(diagnostics, d => Assert.Equal(Diagnostics.Contracts.ProcessTaskMemberNotImplemented.Id, d.Id));
        Assert.Contains(
            "Declare it as 'public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context)'",
            diagnostics
                .Single(d => ReportedMethod(d).StartsWith("WrongParameter.", StringComparison.Ordinal))
                .GetMessage()
        );
    }

    [Fact]
    public async Task Reports_Every_Method_Of_The_Name_When_None_Implements_It()
    {
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public sealed class TwoAttempts : IServiceTask
                {
                {{ServiceTaskMembers}}
                    public void DefineStart(PipelineBuilder.ServiceTask pipeline) { }
                    public void DefineStart(PipelineBuilder.Lifecycle pipeline, int retries) { }
                }
                """
        );

        Assert.Equal(
            [
                "TwoAttempts.DefineStart(PipelineBuilder.ServiceTask)",
                "TwoAttempts.DefineStart(PipelineBuilder.Lifecycle, int)",
            ],
            diagnostics.Select(ReportedMethod)
        );
    }

    [Fact]
    public async Task Reports_A_Task_That_Inherits_The_Interface_From_A_Base_Class_That_Uses_The_Default()
    {
        // A class that inherits an interface keeps its base class's mapping, so even CorrectSignature's method
        // never runs. Listing the interface again, as Relisted and RelistedServiceTask do, maps it anew.
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public abstract class TaskBase : IServiceTask
                {
                {{ServiceTaskMembers}}
                }

                public sealed class WrongSignature : TaskBase
                {
                    public void DefineStart(PipelineBuilder.ServiceTask pipeline) { }
                }

                public sealed class CorrectSignature : TaskBase
                {
                    public void DefineEnd(PipelineBuilder.Lifecycle pipeline) { }
                }

                public sealed class Relisted : TaskBase, IProcessTask
                {
                    public void DefineEnd(PipelineBuilder.Lifecycle pipeline) { }
                }

                public sealed class RelistedServiceTask : TaskBase, IServiceTask
                {
                    public void DefineEnd(PipelineBuilder.Lifecycle pipeline) { }
                }
                """
        );

        Assert.Equal(
            [
                "WrongSignature.DefineStart(PipelineBuilder.ServiceTask)",
                "CorrectSignature.DefineEnd(PipelineBuilder.Lifecycle)",
            ],
            diagnostics.Select(ReportedMethod)
        );
        Assert.EndsWith(
            "Declare it as 'public void DefineEnd(PipelineBuilder.Lifecycle pipeline)' and list IProcessTask among the "
                + "interfaces of 'CorrectSignature': it inherits the interface from a base class, and its own methods "
                + "implement only an interface it lists itself.",
            diagnostics[1].GetMessage()
        );
    }

    [Fact]
    public async Task Implemented_Members_Are_Not_Reported()
    {
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public sealed class Implicit : IServiceTask
                {
                {{ServiceTaskMembers}}
                    public void DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                    public void DefineEnd(PipelineBuilder.Lifecycle pipeline) { }
                    public void DefineAbandon(PipelineBuilder.Lifecycle pipeline) { }
                    public IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context) => [];
                }

                public sealed class Explicit : IServiceTask
                {
                {{ServiceTaskMembers}}
                    void IProcessTask.DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                    IEnumerable<string> IProcessTask.ValidateConfiguration(ProcessTaskValidationContext context) => [];
                }

                public sealed class WithOverload : IProcessTask
                {
                    public string Type => "withOverload";
                    public void DefineStart(PipelineBuilder.Lifecycle pipeline) => DefineStart(pipeline, retries: 3);
                    private void DefineStart(PipelineBuilder.Lifecycle pipeline, int retries) { }
                }

                public sealed class ExplicitWithOverload : IProcessTask
                {
                    public string Type => "explicitWithOverload";
                    void IProcessTask.DefineEnd(PipelineBuilder.Lifecycle pipeline) => DefineEnd(pipeline, "end");
                    public void DefineEnd(PipelineBuilder.Lifecycle pipeline, string label) { }
                }

                public abstract class ImplementingBase : IProcessTask
                {
                    public string Type => "implementingBase";
                    public virtual void DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                }

                public sealed class OverloadOnDerived : ImplementingBase
                {
                    public void DefineStart(PipelineBuilder.ServiceTask pipeline) { }
                }

                public sealed class OverrideOnDerived : ImplementingBase
                {
                    public override void DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                }

                public abstract class GenericBase<T> : IProcessTask
                {
                    public string Type => "genericBase";
                    public void DefineAbandon(PipelineBuilder.Lifecycle pipeline) { }
                }

                public sealed class ClosedGeneric : GenericBase<int>
                {
                    public void DefineAbandon(PipelineBuilder.Lifecycle pipeline, int extra) { }
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Signature_Chosen_Elsewhere_Is_Reported_Only_Where_It_Is_Chosen()
    {
        // The override cannot change the signature its base class gave it, and IReviewHook's member is not
        // IProcessTask's.
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public abstract class HookBase : IServiceTask
                {
                {{ServiceTaskMembers}}
                    protected abstract void DefineEnd(PipelineBuilder.ServiceTask pipeline);
                }

                public sealed class HookOverride : HookBase
                {
                    protected override void DefineEnd(PipelineBuilder.ServiceTask pipeline) { }
                }

                public interface IReviewHook
                {
                    void DefineStart(PipelineBuilder.ServiceTask pipeline);
                }

                public sealed class ReviewTask : IServiceTask, IReviewHook
                {
                {{ServiceTaskMembers}}
                    public void DefineStart(PipelineBuilder.ServiceTask pipeline) { }
                }
                """
        );

        Assert.Equal(["HookBase.DefineEnd(PipelineBuilder.ServiceTask)"], diagnostics.Select(ReportedMethod));
    }

    [Fact]
    public async Task Types_That_Are_Not_Process_Tasks_Are_Not_Reported()
    {
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class Helper
                {
                    public void DefineStart(PipelineBuilder.ServiceTask pipeline) { }
                    public IEnumerable<string> ValidateConfiguration(string context) => [];
                }

                public interface IMyTask : IProcessTask
                {
                    void DefineStart(PipelineBuilder.ServiceTask pipeline);
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Projects_That_Are_Not_Apps_Are_Not_Analyzed()
    {
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public sealed class FetchNote : IServiceTask
                {
                {{ServiceTaskMembers}}
                    public void DefineStart(PipelineBuilder.ServiceTask pipeline) { }
                }
                """,
            isAltinnApp: false
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Nothing_Is_Reported_When_IProcessTask_Does_Not_Resolve()
    {
        // A project that doesn't reference Altinn.App.Core, with its own type of the same simple name.
        var diagnostics = await Analyze(
            """
            public interface IProcessTask
            {
                void DefineStart(object pipeline) { }
            }

            public sealed class Task : IProcessTask
            {
                public void DefineStart(string pipeline) { }
            }
            """,
            referenceCore: false
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Helper_Of_The_Name_That_The_Task_Calls_Itself_Is_Not_Reported()
    {
        // The task keeps the interface's ValidateConfiguration and checks its own settings with a helper of the
        // same name, as DefaultEFormidlingService does. The helper runs, so the rule's premise that the method never
        // does is false, and as an error it breaks a correct app's build.
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class ArchiveSettings
                {
                    public string? Endpoint { get; set; }
                }

                public sealed class ArchiveTask : IServiceTask
                {
                    private readonly ArchiveSettings _settings = new();

                    public string Type => "archive";

                    public void DefineExecute(PipelineBuilder.ServiceTask pipeline)
                    {
                        ValidateConfiguration(_settings);
                        pipeline.Stage(Archive);
                    }

                    private static void ValidateConfiguration(ArchiveSettings settings)
                    {
                        if (settings.Endpoint is null)
                            throw new System.InvalidOperationException("The archive endpoint is not configured.");
                    }

                    private Task<ServiceTaskResult> Archive(StageContext context) =>
                        throw new System.NotImplementedException();
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Helper_Of_The_Name_That_The_Task_Passes_As_A_Delegate_Is_Not_Reported()
    {
        // A stage runs when the pipeline reaches it, so a stage method of the name is a helper too.
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class ArchiveTask : IServiceTask
                {
                    public string Type => "archive";

                    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
                        pipeline.Stage(ValidateConfiguration).Stage(Archive);

                    private Task<ServiceTaskResult> ValidateConfiguration(StageContext context) =>
                        throw new System.NotImplementedException();

                    private Task<ServiceTaskResult> Archive(StageContext context) =>
                        throw new System.NotImplementedException();
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Helper_Called_Only_From_A_Method_Nothing_Calls_Is_Not_Reported()
    {
        // Whether the caller runs is beyond what the rule can prove, and an uncalled private method is the
        // unused-member diagnostics' to report.
        var diagnostics = await Analyze(
            Usings
                + $$"""
                public sealed class LeftoverTask : IServiceTask
                {
                {{ServiceTaskMembers}}
                    private void Leftover(PipelineBuilder.Lifecycle pipeline) => DefineEnd(pipeline, "leftover");
                    private void DefineEnd(PipelineBuilder.Lifecycle pipeline, string label) { }
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task Calls_From_Every_Declaration_Of_The_Task_Count()
    {
        // The call to ValidateConfiguration is in another file's partial part, and the call to DefineEnd in a
        // nested class.
        var diagnostics = await Analyze([
            Usings
                + """
                public sealed partial class SplitTask : IServiceTask
                {
                    public string Type => "split";

                    private static void ValidateConfiguration(string endpoint) { }

                    private static void DefineEnd(string label) { }
                }
                """,
            Usings
                + """
                public sealed partial class SplitTask
                {
                    public void DefineExecute(PipelineBuilder.ServiceTask pipeline)
                    {
                        ValidateConfiguration("https://archive.example");
                        Steps.Define(pipeline);
                    }

                    private static class Steps
                    {
                        public static void Define(PipelineBuilder.ServiceTask pipeline)
                        {
                            DefineEnd("archive");
                            pipeline.Stage(Archive);
                        }

                        private static Task<ServiceTaskResult> Archive(StageContext context) =>
                            throw new System.NotImplementedException();
                    }
                }
                """,
        ]);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task An_Uncalled_Method_Is_Reported_Beside_A_Called_Overload_Of_The_Name()
    {
        // The call settles the one overload it binds to, not the name.
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class ArchiveTask : IServiceTask
                {
                    public string Type => "archive";

                    public void DefineExecute(PipelineBuilder.ServiceTask pipeline)
                    {
                        ValidateConfiguration(endpoint: "https://archive.example", strict: true);
                        pipeline.Stage(Archive);
                    }

                    public IEnumerable<string> ValidateConfiguration(string context) => [];

                    private static void ValidateConfiguration(string endpoint, bool strict) { }

                    private Task<ServiceTaskResult> Archive(StageContext context) =>
                        throw new System.NotImplementedException();
                }
                """
        );

        Assert.Equal(["ArchiveTask.ValidateConfiguration(string)"], diagnostics.Select(ReportedMethod));
    }

    [Fact]
    public async Task A_Base_Class_Helper_Of_The_Name_That_A_Derived_Task_Calls_Is_Not_Reported()
    {
        // ArchiveTask implements DefineEnd and calls its base class's overload, which runs. ArchiveTaskBase doesn't
        // implement DefineEnd itself, so only the derived task's call shows that its helper is not a mistake.
        var diagnostics = await Analyze(
            Usings
                + """
                public abstract class ArchiveTaskBase : IServiceTask
                {
                    public abstract string Type { get; }

                    public abstract void DefineExecute(PipelineBuilder.ServiceTask pipeline);

                    protected void DefineEnd(PipelineBuilder.Lifecycle pipeline, string label) => pipeline.Stage(Revoke);

                    private static Task<StageResult> Revoke(StageContext context) =>
                        throw new System.NotImplementedException();
                }

                public sealed class ArchiveTask : ArchiveTaskBase, IServiceTask
                {
                    public override string Type => "archive";

                    public override void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
                        throw new System.NotImplementedException();

                    public void DefineEnd(PipelineBuilder.Lifecycle pipeline) => DefineEnd(pipeline, "archive");
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Helper_Of_The_Name_That_Another_Class_Of_The_App_Calls_Is_Not_Reported()
    {
        // The app checks the task's settings at startup with the task's helper, so the helper runs.
        var diagnostics = await Analyze(
            Usings
                + """
                public sealed class ArchiveSettings
                {
                    public string? Endpoint { get; set; }
                }

                public sealed class ArchiveTask : IServiceTask
                {
                    public string Type => "archive";

                    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>
                        throw new System.NotImplementedException();

                    internal static void ValidateConfiguration(ArchiveSettings settings)
                    {
                        if (settings.Endpoint is null)
                            throw new System.InvalidOperationException("The archive endpoint is not configured.");
                    }
                }

                public static class Startup
                {
                    public static void CheckSettings(ArchiveSettings settings) => ArchiveTask.ValidateConfiguration(settings);
                }
                """
        );

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Helper_Of_The_Name_That_A_Generated_Part_Of_The_Task_Calls_Is_Not_Reported()
    {
        // The call is in a generated partial part, such as a source generator's. The helper runs, so the call counts,
        // although the rule reports nothing in generated code.
        var diagnostics = await Analyze([
            Usings
                + """
                public sealed partial class SplitTask : IServiceTask
                {
                    public string Type => "split";

                    private static void ValidateConfiguration(string endpoint) { }
                }
                """,
            "// <auto-generated/>\n"
                + Usings
                + """
                public sealed partial class SplitTask
                {
                    public void DefineExecute(PipelineBuilder.ServiceTask pipeline)
                    {
                        ValidateConfiguration("https://archive.example");
                        pipeline.Stage(Archive);
                    }

                    private static Task<ServiceTaskResult> Archive(StageContext context) =>
                        throw new System.NotImplementedException();
                }
                """,
        ]);

        Assert.Empty(diagnostics);
    }

    [Fact]
    public async Task A_Method_Declared_In_Generated_Code_Is_Not_Reported()
    {
        // Generated code is analyzed only for its calls: its author can't correct it, so only the handwritten part's
        // method is reported.
        var diagnostics = await Analyze([
            Usings
                + $$"""
                public sealed partial class SplitTask : IServiceTask
                {
                {{ServiceTaskMembers}}
                    public void DefineEnd(PipelineBuilder.ServiceTask pipeline) { }
                }
                """,
            "// <auto-generated/>\n"
                + Usings
                + """
                public sealed partial class SplitTask
                {
                    public void DefineStart(PipelineBuilder.ServiceTask pipeline) { }
                }
                """,
        ]);

        Assert.Equal(["SplitTask.DefineEnd(PipelineBuilder.ServiceTask)"], diagnostics.Select(ReportedMethod));
    }

    /// <summary>
    /// The method a diagnostic names, as <c>Type.Name(parameter types)</c>.
    /// </summary>
    private static string ReportedMethod(Diagnostic diagnostic) => diagnostic.GetMessage().Split('\'')[1];

    /// <summary>
    /// The source text a diagnostic is reported on.
    /// </summary>
    private static string SourceAt(Diagnostic diagnostic) =>
        diagnostic.Location.SourceTree!.GetText().ToString(diagnostic.Location.SourceSpan);

    private static Task<ImmutableArray<Diagnostic>> Analyze(
        string source,
        bool isAltinnApp = true,
        bool referenceCore = true
    ) => Analyze([source], isAltinnApp, referenceCore);

    private static async Task<ImmutableArray<Diagnostic>> Analyze(
        string[] sources,
        bool isAltinnApp = true,
        bool referenceCore = true
    )
    {
        var assemblies = AppDomain
            .CurrentDomain.GetAssemblies()
            .Where(assembly => !assembly.IsDynamic && !string.IsNullOrWhiteSpace(assembly.Location));
        if (referenceCore)
            assemblies = assemblies.Append(typeof(IServiceTask).Assembly);
        else
            assemblies = assemblies.Where(assembly => assembly != typeof(IServiceTask).Assembly);

        var compilation = CSharpCompilation.Create(
            "App",
            sources.Select(
                (source, index) =>
                    CSharpSyntaxTree.ParseText(
                        source,
                        path: index == 0 ? "/repo/App/Tasks.cs" : $"/repo/App/Tasks{index}.cs"
                    )
            ),
            assemblies.Distinct().Select(assembly => MetadataReference.CreateFromFile(assembly.Location)),
            new CSharpCompilationOptions(
                OutputKind.DynamicallyLinkedLibrary,
                nullableContextOptions: NullableContextOptions.Enable
            )
        );
        Assert.Empty(compilation.GetDiagnostics().Where(d => d.Severity == DiagnosticSeverity.Error));

        var options = new AnalyzerOptions([], new AltinnAppOptionsProvider(isAltinnApp));
        var diagnostics = await compilation
            .WithAnalyzers([new ProcessTaskDefaultMemberAnalyzer()], options)
            .GetAnalyzerDiagnosticsAsync(CancellationToken.None);

        // The analyzer runs concurrently, so it reports in no fixed order.
        return [.. diagnostics.OrderBy(d => d.Location.SourceTree?.FilePath).ThenBy(d => d.Location.SourceSpan.Start)];
    }
}
