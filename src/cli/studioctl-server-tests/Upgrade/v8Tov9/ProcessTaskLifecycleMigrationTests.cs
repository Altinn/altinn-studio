using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the <c>IProcessTask</c> lifecycle members v9 removes. The contract is "the migrated app compiles against
/// v9 and still runs its v8 work": each rewrite is compiled against a v9-shaped stub, and the text assertions pin the
/// member the rewrite adds. Most cases run both with a semantic model (the app compiled against v8) and without.
/// </summary>
public sealed class ProcessTaskLifecycleMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private string Write(string relativePath, string content) =>
        _app.Write(relativePath, content.ReplaceLineEndings("\n"));

    /// <summary>
    /// The process task surface in its v8 shape, with the three lifecycle members (defaulted here so a fixture can
    /// implement one of them alone), or its v9 shape, where they are gone and the task composes stages instead.
    /// </summary>
    private static string SdkStub(bool v9)
    {
        var members = v9
            ? """
                        ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Build();
                        ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Build();
                        ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();
                """
            : """
                        Task Start(string taskId, Instance instance) => Task.CompletedTask;
                        Task End(string taskId, Instance instance) => Task.CompletedTask;
                        Task Abandon(string taskId, Instance instance) => Task.CompletedTask;
                """;
        return $$"""
            #nullable enable
            using System;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features;
            using Altinn.App.Core.Features.Process;
            using Altinn.Platform.Storage.Interface.Models;

            namespace Altinn.Platform.Storage.Interface.Models
            {
                public class ProcessElementInfo
                {
                    public string? ElementId { get; set; }
                }

                public class ProcessState
                {
                    public ProcessElementInfo? CurrentTask { get; set; }
                }

                public class Instance
                {
                    public ProcessState? Process { get; set; }
                }
            }

            namespace Altinn.App.Core.Features
            {
                public interface IInstanceDataMutator
                {
                    Instance Instance { get; }
                }
            }

            namespace Altinn.App.Core.Features.Process
            {
                public sealed class StageContext
                {
                    public required IInstanceDataMutator InstanceDataMutator { get; init; }
                }

                public abstract class StageResult
                {
                    public static StageResult Completed() => throw new NotImplementedException();
                }

                public sealed class ProcessTaskPipeline { }

                public sealed class PipelineBuilder
                {
                    public PipelineBuilder Stage(Func<StageContext, Task<StageResult>> work) => this;
                    public ProcessTaskPipeline Build() => new();
                }
            }

            namespace Altinn.App.Core.Internal.Process.ProcessTasks
            {
                public interface IProcessTask
                {
                    string Type { get; }

            {{members}}
                }
            }
            """;
    }

    private static readonly Lazy<MetadataReference> _v8Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(v9: false))
    );

    private static readonly Lazy<MetadataReference> _v9Sdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(v9: true))
    );

    /// <summary>The usings every fixture file needs; the v8 app template has no implicit usings.</summary>
    private const string Usings = """
        using System;
        using System.Threading.Tasks;
        using Altinn.App.Core.Internal.Process.ProcessTasks;
        using Altinn.Platform.Storage.Interface.Models;
        """;

    /// <summary>A v8 task that implements the three members implicitly, in the shapes apps write them.</summary>
    private const string LegacyTask = """
        public class ParallelSigningTask : IProcessTask
        {
            public string Type => "parallelSigning";

            public Task Start(string taskId, Instance instance)
            {
                return Task.CompletedTask;
            }

            /// <summary>Ends the task.</summary>
            public Task End(string taskId, Instance instance) => Task.CompletedTask;

            public async Task Abandon(string taskId, Instance instance)
            {
                await Task.Yield();
            }
        }
        """;

    private CSharpSourceScanner Scanner(bool semantic) =>
        semantic ? SemanticScannerFactory.CreateScanner(AppFolder, _v8Sdk.Value) : new(AppFolder);

    private MigrationResult Migrate(bool semantic) =>
        new ProcessTaskLifecycleMigration(Scanner(semantic)).Migrate(TestContext.Current.CancellationToken);

    private void AssertCompilesAgainstV9()
    {
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value);
        Assert.True(errors.Count == 0, "Migrated app does not compile against v9:\n" + string.Join("\n", errors));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LegacyMembers_GetADefinitionEach_AndCompileAgainstV9(bool semantic)
    {
        var task = Write("logic/ParallelSigningTask.cs", Usings + "\n" + LegacyTask);

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Equal(3, result.Warnings.Count);
        Assert.All(result.Warnings, warning => Assert.Contains("ParallelSigningTask.cs:", warning));
        Assert.Contains(
            result.Warnings,
            warning => warning.Contains("Added a DefineStart that runs Start as one stage")
        );
        AssertCompilesAgainstV9();

        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        // The v8 method is untouched, and the definition follows it with the same indentation, its types qualified
        // for the final pass to simplify.
        Assert.Contains(
            "    public Task Start(string taskId, Instance instance)\n"
                + "    {\n"
                + "        return Task.CompletedTask;\n"
                + "    }\n"
                + "\n"
                + "    public global::Altinn.App.Core.Features.Process.ProcessTaskPipeline DefineStart("
                + "global::Altinn.App.Core.Features.Process.PipelineBuilder pipeline) =>\n"
                + "        pipeline\n"
                + "            .Stage(async context =>\n"
                + "            {\n"
                + "                await Start(\n",
            migrated
        );
        Assert.Contains("return global::Altinn.App.Core.Features.Process.StageResult.Completed();", migrated);
        Assert.Contains("DefineEnd(", migrated);
        Assert.Contains("DefineAbandon(", migrated);
        // The doc comment stays with the method it documents.
        Assert.Contains("    /// <summary>Ends the task.</summary>\n    public Task End(", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitLegacyMember_BecomesPrivate_AndGetsADefinition(bool semantic)
    {
        var task = Write(
            "logic/ExplicitTask.cs",
            Usings
                + """
                public class ExplicitTask : IProcessTask
                {
                    public string Type => "explicit";

                    /// <summary>Starts the task.</summary>
                    Task IProcessTask.Start(string taskId, Instance instance) => Task.CompletedTask;
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();

        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        Assert.DoesNotContain("IProcessTask.Start", migrated);
        Assert.Contains(
            "    /// <summary>Starts the task.</summary>\n    private Task Start(string taskId, Instance instance) => Task.CompletedTask;\n",
            migrated
        );
        Assert.Contains("DefineStart(", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task TaskThatAlreadyComposesThePhase_KeepsItsDefinition(bool semantic)
    {
        var task = Write(
            "logic/ComposedTask.cs",
            Usings
                + """
                using Altinn.App.Core.Features.Process;

                public class ComposedTask : IProcessTask
                {
                    public string Type => "composed";

                    public Task Start(string taskId, Instance instance) => Task.CompletedTask;

                    public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Build();
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("composes DefineStart, which runs instead", warning);
        AssertCompilesAgainstV9();

        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        Assert.Single(migrated.Split("DefineStart(").Skip(1));
        Assert.Contains("public Task Start(string taskId, Instance instance) => Task.CompletedTask;", migrated);
    }

    [Fact]
    public async Task PartialType_DeclaringTheMethodInAnotherPart_IsMigratedWithoutASemanticModel()
    {
        Write(
            "logic/SplitTask.cs",
            Usings
                + """
                public partial class SplitTask : IProcessTask
                {
                    public string Type => "split";
                }
                """
        );
        var methods = Write(
            "logic/SplitTask.Lifecycle.cs",
            Usings
                + """
                public partial class SplitTask
                {
                    public Task Start(string taskId, Instance instance) => Task.CompletedTask;
                }
                """
        );

        var result = Migrate(semantic: false);

        Assert.Empty(result.Todos);
        Assert.Single(result.Warnings);
        AssertCompilesAgainstV9();
        Assert.Contains("DefineStart(", await File.ReadAllTextAsync(methods, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task InheritedImplementation_GetsTheDefinitionBesideTheMethod()
    {
        var baseFile = Write(
            "logic/BaseTask.cs",
            Usings
                + """
                public abstract class BaseTask
                {
                    public Task Start(string taskId, Instance instance) => Task.CompletedTask;
                }
                """
        );
        var derived = Write(
            "logic/DerivedTask.cs",
            Usings
                + """
                public class DerivedTask : BaseTask, IProcessTask
                {
                    public string Type => "derived";
                }
                """
        );

        var result = Migrate(semantic: true);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("BaseTask.Start", warning);
        Assert.Contains("DerivedTask implements IProcessTask through it", warning);
        AssertCompilesAgainstV9();
        // The definition sits beside the method, in the base class; the task inherits it.
        Assert.Contains("DefineStart(", await File.ReadAllTextAsync(baseFile, TestContext.Current.CancellationToken));
        Assert.DoesNotContain(
            "DefineStart(",
            await File.ReadAllTextAsync(derived, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public void InheritanceWithoutASemanticModel_IsReported()
    {
        Write(
            "logic/BaseTask.cs",
            Usings
                + """
                public abstract class BaseTask
                {
                    public Task Start(string taskId, Instance instance) => Task.CompletedTask;
                }

                public class DerivedTask : BaseTask, IProcessTask
                {
                    public string Type => "derived";
                }
                """
        );

        var result = Migrate(semantic: false);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("DerivedTask lists IProcessTask but declares none of Start, End and Abandon", todo);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitBesideImplicit_IsRenamedToAvoidACollision(bool semantic)
    {
        var task = Write(
            "logic/TwoStartsTask.cs",
            Usings
                + """
                public class TwoStartsTask : IProcessTask
                {
                    public string Type => "two";

                    public Task Start(string taskId, Instance instance) => Task.CompletedTask;

                    Task IProcessTask.Start(string taskId, Instance instance) => Task.Delay(1);
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        var warning = Assert.Single(result.Warnings);
        Assert.Contains("runs RunStart as one stage", warning);
        AssertCompilesAgainstV9();

        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        Assert.Contains("private Task RunStart(string taskId, Instance instance) => Task.Delay(1);", migrated);
        Assert.Contains("await RunStart(", migrated);
        Assert.Contains("public Task Start(string taskId, Instance instance) => Task.CompletedTask;", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task UnrelatedDefineHelper_DoesNotCountAsADefinition(bool semantic)
    {
        var task = Write(
            "logic/HelperTask.cs",
            Usings
                + """
                public class HelperTask : IProcessTask
                {
                    public string Type => "helper";

                    public Task Start(string taskId, Instance instance) => Task.CompletedTask;

                    public void DefineStart() { }
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Contains("Added a DefineStart", Assert.Single(result.Warnings));
        AssertCompilesAgainstV9();
        Assert.Contains(
            "DefineStart(global::Altinn.App.Core.Features.Process.PipelineBuilder pipeline)",
            await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task PrivateDefineHelper_IsReportedInsteadOfBeingTakenForTheDefinition(bool semantic)
    {
        var task = Write(
            "logic/PrivateHelperTask.cs",
            Usings
                + """
                using Altinn.App.Core.Features.Process;

                public class PrivateHelperTask : IProcessTask
                {
                    public string Type => "private";

                    public Task Start(string taskId, Instance instance) => Task.CompletedTask;

                    private ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Build();
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("DefineStart(PipelineBuilder) cannot take its place", todo);
        // Nothing generated: a public member of that signature would collide with the helper.
        Assert.DoesNotContain(
            "global::Altinn.App.Core.Features.Process.ProcessTaskPipeline DefineStart",
            await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken)
        );
    }

    [Fact]
    public void TaskWithNoLegacyMembers_IsLeftAlone()
    {
        Write(
            "logic/PlainTask.cs",
            Usings
                + """
                public class PlainTask : IProcessTask
                {
                    public string Type => "plain";
                }
                """
        );

        var result = Migrate(semantic: false);

        Assert.Empty(result.Warnings);
        Assert.Empty(result.Todos);
    }

    [Fact]
    public void AppDeclaringItsOwnInterface_IsReportedWithoutASemanticModel()
    {
        Write(
            "logic/OwnInterface.cs",
            """
            using System.Threading.Tasks;
            using Altinn.Platform.Storage.Interface.Models;

            public interface IProcessTask
            {
                Task Start(string taskId, Instance instance);
            }

            public class OwnTask : IProcessTask
            {
                public Task Start(string taskId, Instance instance) => Task.CompletedTask;
            }
            """
        );

        var result = Migrate(semantic: false);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("OwnTask may implement the v9 IProcessTask or the app's own interface", todo);
    }
}
