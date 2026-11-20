using System.Reflection;
using System.Runtime.Loader;
using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers the <c>IProcessTask</c> lifecycle members v9 removes. The contract is "no v8 work is silently lost": a
/// member that does nothing is removed and the app compiles against a v9-shaped stub, and a member that does work
/// gets a port stub whose only compile errors are its own, so the build stops until the work is composed as stages,
/// and that throws if only its <c>#error</c> is removed.
/// Most cases run both with a semantic model (the app compiled against v8) and without.
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
                        void DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                        void DefineEnd(PipelineBuilder.Lifecycle pipeline) { }
                        void DefineAbandon(PipelineBuilder.Lifecycle pipeline) { }
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

                public sealed record ProcessStepOptions { }

                public abstract class PipelineBuilder
                {
                    private PipelineBuilder() { }

                    public sealed class Lifecycle : PipelineBuilder
                    {
                        public Lifecycle Stage(
                            Func<StageContext, Task<StageResult>> work,
                            ProcessStepOptions? options = null
                        ) => this;
                    }
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

    private static IReadOnlyList<string> Oks(MigrationResult result) =>
        [.. result.Messages.Where(static m => m.Status == UpgradeMessageStatus.Ok).Select(static m => m.Text)];

    private void AssertCompilesAgainstV9() => AssertCompilesAgainstV9ExceptPortStubs(0);

    /// <summary>
    /// The only errors are the port stubs' own: each stops the build with its <c>#error</c> (CS1029).
    /// </summary>
    private void AssertCompilesAgainstV9ExceptPortStubs(int stubs)
    {
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _v9Sdk.Value);
        Assert.True(
            errors.All(static error => error.Id == "CS1029") && errors.Count == stubs,
            $"Expected only the errors of {stubs} port stub(s) against v9:\n" + string.Join("\n", errors)
        );
    }

    /// <summary>
    /// Calls the task's lifecycle method as the v9 libraries do when they compose its pipeline, and returns what it
    /// threw. The app and the v9 stub are compiled into one assembly, so it loads without resolving the stub.
    /// </summary>
    private Exception? ComposeAgainstV9(string taskType, string definition)
    {
        var compilation = SemanticScannerFactory
            .Compile(AppFolder, _v9Sdk.Value)
            .RemoveReferences(_v9Sdk.Value)
            .AddSyntaxTrees(CSharpSyntaxTree.ParseText(SdkStub(v9: true)));
        using var image = new MemoryStream();
        var emit = compilation.Emit(image, cancellationToken: TestContext.Current.CancellationToken);
        Assert.True(emit.Success, string.Join("\n", emit.Diagnostics));
        image.Position = 0;
        var context = new AssemblyLoadContext(nameof(ComposeAgainstV9), isCollectible: true);
        try
        {
            var assembly = context.LoadFromStream(image);
            var type = assembly.GetType(taskType, throwOnError: true, ignoreCase: false);
            var builder = assembly.GetType(
                "Altinn.App.Core.Features.Process.PipelineBuilder+Lifecycle",
                throwOnError: true,
                ignoreCase: false
            );
            Assert.NotNull(type);
            Assert.NotNull(builder);
            var method = type.GetMethod(definition);
            Assert.NotNull(method);
            try
            {
                method.Invoke(Activator.CreateInstance(type), [Activator.CreateInstance(builder)]);
                return null;
            }
            catch (TargetInvocationException e)
            {
                return e.InnerException;
            }
        }
        finally
        {
            context.Unload();
        }
    }

    /// <summary>
    /// The upgraded app as the final pass sees it: its files, compiled against the v9 stub.
    /// </summary>
    private Project V9Project(AdhocWorkspace workspace)
    {
        var compilation = SemanticScannerFactory.Compile(AppFolder, _v9Sdk.Value);
        var project = workspace.AddProject(
            ProjectInfo.Create(
                ProjectId.CreateNewId(),
                VersionStamp.Create(),
                "App",
                "App",
                LanguageNames.CSharp,
                compilationOptions: compilation.Options,
                metadataReferences: compilation.References
            )
        );
        foreach (var tree in compilation.SyntaxTrees)
        {
            project = project
                .AddDocument(
                    Path.GetFileName(tree.FilePath),
                    tree.GetText(TestContext.Current.CancellationToken),
                    filePath: tree.FilePath
                )
                .Project;
        }

        return project;
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MembersThatDoNothing_AreRemoved_AndOneThatWorks_GetsAPortStub(bool semantic)
    {
        var task = Write("logic/ParallelSigningTask.cs", Usings + "\n" + LegacyTask);

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        Assert.Equal(2, Oks(result).Count);
        Assert.Contains(
            Oks(result),
            ok => ok.Contains("ParallelSigningTask.Start(string taskId, Instance instance) did nothing")
        );
        var todo = Assert.Single(result.Todos);
        Assert.Contains("ParallelSigningTask.cs:", todo);
        Assert.Contains("Added a DefineAbandon that stops the build until the work is ported to stages", todo);
        AssertCompilesAgainstV9ExceptPortStubs(1);

        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        // Start and End are gone with their doc comment, and the v8 Abandon stays, followed by the stub with the same
        // indentation, its types qualified for the final pass to simplify.
        Assert.DoesNotContain("Start(", migrated);
        Assert.DoesNotContain("End(", migrated);
        Assert.DoesNotContain("Ends the task", migrated);
        Assert.Contains(
            "    public string Type => \"parallelSigning\";\n"
                + "\n"
                + "    public async Task Abandon(string taskId, Instance instance)\n"
                + "    {\n"
                + "        await Task.Yield();\n"
                + "    }\n"
                + "\n"
                + "    public void DefineAbandon("
                + "global::Altinn.App.Core.Features.Process.PipelineBuilder.Lifecycle pipeline)\n"
                + "    {\n"
                + "        #error Port Abandon to stages in DefineAbandon as the comment below says, then remove this line.\n"
                + "        // v9 no longer calls Abandon(string taskId, Instance instance). It runs the stages this method\n"
                + "        // composes when the task is abandoned,",
            migrated
        );
        Assert.Contains("through context.InstanceDataMutator, not through IDataClient", migrated);
        Assert.Contains("context.StepId is the same on every retry", migrated);
        // The example composition is commented out; the only statement throws until the work is ported.
        Assert.Contains("        // pipeline.Stage(FirstStage).Stage(SecondStage);\n", migrated);
        Assert.Contains(
            "        // }\n"
                + "\n"
                + "        throw new global::System.NotImplementedException(\"Port Abandon to stages in DefineAbandon, "
                + "then delete the line that throws this exception.\");\n"
                + "    }\n",
            migrated
        );
    }

    [Fact]
    public async Task PortStub_WithOnlyItsErrorRemoved_CompilesAndThrowsWhenComposed()
    {
        var task = Write("logic/ParallelSigningTask.cs", Usings + "\n" + LegacyTask);
        Migrate(semantic: false);
        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        var error = Assert.Single(
            migrated.Split('\n'),
            static line => line.TrimStart().StartsWith("#error", StringComparison.Ordinal)
        );
        await File.WriteAllTextAsync(
            task,
            migrated.Replace(error + "\n", "", StringComparison.Ordinal),
            TestContext.Current.CancellationToken
        );

        AssertCompilesAgainstV9();
        var thrown = Assert.IsType<NotImplementedException>(ComposeAgainstV9("ParallelSigningTask", "DefineAbandon"));
        Assert.Equal(
            "Port Abandon to stages in DefineAbandon, then delete the line that throws this exception.",
            thrown.Message
        );
    }

    [Fact]
    public async Task FinalPass_ShortensThePortStubsTypes()
    {
        var task = Write("logic/ParallelSigningTask.cs", Usings + "\n" + LegacyTask);
        var scanner = Scanner(semantic: false);
        new ProcessTaskLifecycleMigration(scanner).Migrate(TestContext.Current.CancellationToken);
        using var workspace = new AdhocWorkspace();

        var finalized = await GeneratedTypeReferenceFinalizer.FinalizeAsync(
            scanner,
            [V9Project(workspace)],
            TestContext.Current.CancellationToken
        );

        Assert.Equal(1, finalized.ChangedFiles);
        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        Assert.Contains("using Altinn.App.Core.Features.Process;\n", migrated);
        Assert.Contains("    public void DefineAbandon(PipelineBuilder.Lifecycle pipeline)\n", migrated);
        Assert.Contains("        throw new NotImplementedException(\"Port Abandon to stages", migrated);
        AssertCompilesAgainstV9ExceptPortStubs(1);
    }

    [Fact]
    public async Task RunningAgain_KeepsThePortStub_AndAddsNoSecond()
    {
        var task = Write("logic/ParallelSigningTask.cs", Usings + "\n" + LegacyTask);
        Migrate(semantic: false);
        var once = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);

        // Without a semantic model: the stub's #error stops the app compiling.
        var result = Migrate(semantic: false);

        Assert.Empty(result.Todos);
        Assert.Contains("composes DefineAbandon, which runs instead", Assert.Single(result.Warnings));
        Assert.Equal(once, await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task EveryShapeOfDoingNothing_IsRemoved(bool semantic)
    {
        var task = Write(
            "logic/IdleTask.cs",
            Usings
                + """
                public class IdleTask : IProcessTask
                {
                    public string Type => "idle";

                    public async Task Start(string taskId, Instance instance)
                    {
                        // Nothing to do yet.
                    }

                    public Task End(string taskId, Instance instance)
                    {
                        return System.Threading.Tasks.Task.CompletedTask;
                    }

                    async Task IProcessTask.Abandon(string taskId, Instance instance)
                    {
                        await Task.CompletedTask;
                    }
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
        Assert.Equal(3, Oks(result).Count);
        AssertCompilesAgainstV9();
        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        Assert.DoesNotContain("Instance instance", migrated);
        Assert.DoesNotContain("Define", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MemberThatDoesNothing_ButTheAppCalls_IsKept(bool semantic)
    {
        var task = Write(
            "logic/CalledTask.cs",
            Usings
                + """
                public class CalledTask : IProcessTask
                {
                    public string Type => "called";

                    public Task Start(string taskId, Instance instance) => Task.CompletedTask;
                }

                public class Caller
                {
                    public Task Run(CalledTask task, Instance instance) => task.Start("Task_1", instance);
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Empty(Oks(result));
        Assert.Contains("It was kept because the app may call or override it", Assert.Single(result.Warnings));
        AssertCompilesAgainstV9();
        Assert.Contains(
            "public Task Start(string taskId, Instance instance) => Task.CompletedTask;",
            await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExplicitLegacyMember_BecomesPrivate_AndGetsAPortStub(bool semantic)
    {
        var task = Write(
            "logic/ExplicitTask.cs",
            Usings
                + """
                public class ExplicitTask : IProcessTask
                {
                    public string Type => "explicit";

                    /// <summary>Starts the task.</summary>
                    Task IProcessTask.Start(string taskId, Instance instance) => Task.Delay(1);
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        Assert.Contains("stays as the type's own private Start to port from", Assert.Single(result.Todos));
        AssertCompilesAgainstV9ExceptPortStubs(1);

        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        Assert.DoesNotContain("IProcessTask.Start", migrated);
        Assert.Contains(
            "    /// <summary>Starts the task.</summary>\n    private Task Start(string taskId, Instance instance) => Task.Delay(1);\n",
            migrated
        );
        Assert.Contains("DefineStart(", migrated);
    }

    [Theory]
    [InlineData(true, "PipelineBuilder.Lifecycle")]
    [InlineData(false, "PipelineBuilder.Lifecycle")]
    [InlineData(true, "global::Altinn.App.Core.Features.Process.PipelineBuilder.Lifecycle")]
    [InlineData(false, "global::Altinn.App.Core.Features.Process.PipelineBuilder.Lifecycle")]
    public async Task TaskThatAlreadyComposesThePhase_KeepsItsDefinition(bool semantic, string builder)
    {
        var task = Write(
            "logic/ComposedTask.cs",
            Usings
                + $$"""
                using Altinn.App.Core.Features.Process;

                public class ComposedTask : IProcessTask
                {
                    public string Type => "composed";

                    public Task Start(string taskId, Instance instance) => Task.Delay(1);

                    public void DefineStart({{builder}} pipeline) => pipeline.Stage(Begin);

                    private Task<StageResult> Begin(StageContext context) => Task.FromResult(StageResult.Completed());
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
        Assert.Contains("public Task Start(string taskId, Instance instance) => Task.Delay(1);", migrated);
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
                    public Task Start(string taskId, Instance instance) => Task.Delay(1);
                }
                """
        );

        var result = Migrate(semantic: false);

        Assert.Empty(result.Warnings);
        Assert.Single(result.Todos);
        AssertCompilesAgainstV9ExceptPortStubs(1);
        Assert.Contains("DefineStart(", await File.ReadAllTextAsync(methods, TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task InheritedImplementation_GetsThePortStubBesideTheMethod()
    {
        var baseFile = Write(
            "logic/BaseTask.cs",
            Usings
                + """
                public abstract class BaseTask
                {
                    public Task Start(string taskId, Instance instance) => Task.Delay(1);
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

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("BaseTask.Start", todo);
        Assert.Contains("DerivedTask implements IProcessTask through it", todo);
        AssertCompilesAgainstV9ExceptPortStubs(1);
        // The stub sits beside the method, in the base class; the task inherits it.
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

        Assert.Empty(result.Warnings);
        Assert.Contains("private RunStart to port from", Assert.Single(result.Todos));
        AssertCompilesAgainstV9ExceptPortStubs(1);

        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        Assert.Contains("private Task RunStart(string taskId, Instance instance) => Task.Delay(1);", migrated);
        Assert.Contains("#error Port RunStart to stages in DefineStart", migrated);
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

                    public Task Start(string taskId, Instance instance) => Task.Delay(1);

                    public void DefineStart() { }
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        Assert.Contains("Added a DefineStart", Assert.Single(result.Todos));
        AssertCompilesAgainstV9ExceptPortStubs(1);
        Assert.Contains(
            "public void DefineStart(global::Altinn.App.Core.Features.Process.PipelineBuilder.Lifecycle pipeline)",
            await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken)
        );
    }

    [Theory]
    [InlineData(true, "private void DefineStart(PipelineBuilder.Lifecycle pipeline) { }")]
    [InlineData(false, "private void DefineStart(PipelineBuilder.Lifecycle pipeline) { }")]
    [InlineData(true, "public int DefineStart(PipelineBuilder.Lifecycle pipeline) => 0;")]
    [InlineData(false, "public int DefineStart(PipelineBuilder.Lifecycle pipeline) => 0;")]
    public async Task DefineV9CannotCall_IsReportedInsteadOfBeingTakenForTheDefinition(bool semantic, string definition)
    {
        var task = Write(
            "logic/PrivateHelperTask.cs",
            Usings
                + $$"""
                using Altinn.App.Core.Features.Process;

                public class PrivateHelperTask : IProcessTask
                {
                    public string Type => "private";

                    public Task Start(string taskId, Instance instance) => Task.Delay(1);

                    {{definition}}
                }
                """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        var todo = Assert.Single(result.Todos);
        Assert.Contains("DefineStart(PipelineBuilder.Lifecycle) cannot take its place", todo);
        // Nothing generated: a public member of that signature would collide with it.
        Assert.DoesNotContain("#error", await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken));
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

        Assert.Empty(result.Messages);
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
