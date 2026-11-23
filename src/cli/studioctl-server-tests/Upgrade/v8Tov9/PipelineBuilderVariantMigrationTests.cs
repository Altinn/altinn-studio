using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers moving pipelines written for an earlier v9 preview, where every <c>Define</c> method got one
/// <c>PipelineBuilder</c>, to the builder variants. Each fixture compiles against a stand-in of the preview's API and,
/// once migrated, against a stand-in of the current one, where <c>Finally</c>, <c>ConcludeOnReplies</c>,
/// <c>Build</c> and a public <c>ProcessTaskPipeline</c> no longer exist. Most cases run both with a semantic model
/// (the app compiled against the preview) and without, which is how the upgrade sees an app already on v9.
/// </summary>
public sealed class PipelineBuilderVariantMigrationTests : IDisposable
{
    private readonly TempAppFolder _app = new();

    public void Dispose() => _app.Dispose();

    private string AppFolder => Path.Combine(_app.Root, "App");

    private string Write(string relativePath, string content) =>
        _app.Write(relativePath, (Usings + "\n" + content).ReplaceLineEndings("\n"));

    private const string Usings = """
        using System;
        using System.Threading.Tasks;
        using Altinn.App.Core.Features.Process;
        using Altinn.App.Core.Internal.Process.ProcessTasks;
        using Altinn.Platform.Storage.Interface.Models;
        """;

    private const string PreviewBuilder = """
        public sealed class ServiceTaskPipeline { }

        public sealed class ProcessTaskPipeline { }

        public sealed class PipelineBuilder
        {
            public PipelineBuilder Stage(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? options = null) =>
                this;

            public PipelineBuilder Stage(
                Func<StageContext, ServiceTaskMailbox, Task<ServiceTaskOpeningStageResult>> work,
                MailboxOptions mailbox,
                out MailboxHandle handle,
                ProcessStepOptions? options = null
            )
            {
                handle = new MailboxHandle();
                return this;
            }

            public PipelineBuilder HandleReplies(
                MailboxHandle handle,
                Func<StageContext, ServiceTaskReply, Task<StageExchangeResult>> onMessage,
                Func<StageContext, MailboxClosedReason, Task<StageResult>> onClosed,
                ProcessStepOptions? options = null
            ) => this;

            public ProcessTaskPipeline Build() => new();

            public ServiceTaskPipeline Finally(
                Func<StageContext, Task<ServiceTaskResult>> work,
                ProcessStepOptions? options = null
            ) => new();

            public ServiceTaskPipeline ConcludeOnReplies(
                MailboxHandle handle,
                Func<StageContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
                Func<StageContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
                ProcessStepOptions? options = null
            ) => new();
        }
        """;

    private const string CurrentBuilder = """
        public sealed class ServiceTaskPipeline { }

        public abstract class PipelineBuilder
        {
            private PipelineBuilder() { }

            public sealed class Lifecycle : PipelineBuilder
            {
                public Lifecycle Stage(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? options = null) =>
                    this;
            }

            public sealed class ServiceTask : PipelineBuilder
            {
                public ServiceTask Stage(Func<StageContext, Task<StageResult>> work, ProcessStepOptions? options = null) =>
                    this;

                public ServiceTaskPipeline Stage(
                    Func<StageContext, Task<ServiceTaskResult>> work,
                    ProcessStepOptions? options = null
                ) => new();

                public ServiceTask Stage(
                    Func<StageContext, ServiceTaskMailbox, Task<ServiceTaskOpeningStageResult>> work,
                    MailboxOptions mailbox,
                    out MailboxHandle handle,
                    ProcessStepOptions? options = null
                )
                {
                    handle = new MailboxHandle();
                    return this;
                }

                public ServiceTask HandleReplies(
                    MailboxHandle handle,
                    Func<StageContext, ServiceTaskReply, Task<StageExchangeResult>> onMessage,
                    Func<StageContext, MailboxClosedReason, Task<StageResult>> onClosed,
                    ProcessStepOptions? options = null
                ) => this;

                public ServiceTaskPipeline HandleReplies(
                    MailboxHandle handle,
                    Func<StageContext, ServiceTaskReply, Task<ServiceTaskExchangeResult>> onMessage,
                    Func<StageContext, MailboxClosedReason, Task<ServiceTaskResult>> onClosed,
                    ProcessStepOptions? options = null
                ) => new();
            }
        }
        """;

    /// <summary>
    /// The pipeline surface of the App library in the preview's shape or the current one.
    /// </summary>
    private static string SdkStub(bool current)
    {
        var (builder, lifecycleMembers, executeBuilder) = current
            ? (
                CurrentBuilder,
                """
                        void DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                        void DefineEnd(PipelineBuilder.Lifecycle pipeline) { }
                        void DefineAbandon(PipelineBuilder.Lifecycle pipeline) { }
                """,
                "PipelineBuilder.ServiceTask"
            )
            : (
                PreviewBuilder,
                """
                        ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Build();
                        ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Build();
                        ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();
                """,
                "PipelineBuilder"
            );
        return $$"""
            #nullable enable
            using System;
            using System.Threading.Tasks;
            using Altinn.App.Core.Features.Process;
            using Altinn.App.Core.Internal.Process.ProcessTasks;

            namespace Altinn.Platform.Storage.Interface.Models
            {
                public class Instance { }
            }

            namespace Altinn.App.Core.Features.Process
            {
                public sealed class StageContext { }

                public sealed class StageResult
                {
                    public static StageResult Completed() => new();
                }

                public sealed class ServiceTaskResult
                {
                    public static ServiceTaskResult Success() => new();
                }

                public sealed class StageExchangeResult
                {
                    public static StageExchangeResult AwaitNextReply() => new();
                }

                public sealed class ServiceTaskExchangeResult
                {
                    public static ServiceTaskExchangeResult Conclude() => new();
                }

                public sealed class ServiceTaskOpeningStageResult
                {
                    public static ServiceTaskOpeningStageResult Sent() => new();
                }

                public sealed class ServiceTaskReply { }

                public sealed class ServiceTaskMailbox { }

                public enum MailboxClosedReason
                {
                    TimedOut,
                }

                public sealed record MailboxOptions(TimeSpan Timeout);

                public sealed class MailboxHandle { }

                public sealed record ProcessStepOptions { }

            {{builder}}

                public interface IServiceTask : IProcessTask
                {
                    ServiceTaskPipeline DefineExecute({{executeBuilder}} pipeline);
                }
            }

            namespace Altinn.App.Core.Internal.Process.ProcessTasks
            {
                public interface IProcessTask
                {
                    string Type { get; }

            {{lifecycleMembers}}
                }
            }
            """;
    }

    private static readonly Lazy<MetadataReference> _previewSdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(current: false))
    );

    private static readonly Lazy<MetadataReference> _currentSdk = new(static () =>
        SemanticScannerFactory.EmitStubAssembly("Altinn.App.Core", SdkStub(current: true))
    );

    /// <summary>
    /// Stage methods every fixture class can pass, in the shapes the builders take.
    /// </summary>
    private const string StageMethods = """
            private Task<StageResult> Archive(StageContext context) => Task.FromResult(StageResult.Completed());

            private Task<ServiceTaskResult> Done(StageContext context) => Task.FromResult(ServiceTaskResult.Success());

            private Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                Task.FromResult(ServiceTaskOpeningStageResult.Sent());

            private Task<StageExchangeResult> OnReply(StageContext context, ServiceTaskReply reply) =>
                Task.FromResult(StageExchangeResult.AwaitNextReply());

            private Task<StageResult> OnGone(StageContext context, MailboxClosedReason reason) =>
                Task.FromResult(StageResult.Completed());

            private Task<ServiceTaskExchangeResult> OnAnswer(StageContext context, ServiceTaskReply reply) =>
                Task.FromResult(ServiceTaskExchangeResult.Conclude());

            private Task<ServiceTaskResult> OnTimeout(StageContext context, MailboxClosedReason reason) =>
                Task.FromResult(ServiceTaskResult.Success());
        """;

    private CSharpSourceScanner Scanner(bool semantic, MetadataReference? sdk = null) =>
        semantic ? SemanticScannerFactory.CreateScanner(AppFolder, sdk ?? _previewSdk.Value) : new(AppFolder);

    private MigrationResult Migrate(bool semantic, MetadataReference? sdk = null) =>
        new PipelineBuilderVariantMigration(Scanner(semantic, sdk)).Migrate(TestContext.Current.CancellationToken);

    private static IReadOnlyList<string> Oks(MigrationResult result) =>
        [.. result.Messages.Where(static m => m.Status == UpgradeMessageStatus.Ok).Select(static m => m.Text)];

    /// <summary>
    /// The only errors against the current API are the port stubs' own <c>#error</c> lines (CS1029).
    /// </summary>
    private void AssertCompilesAgainstCurrent(int stubs = 0)
    {
        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _currentSdk.Value);
        Assert.True(
            errors.All(static error => error.Id == "CS1029") && errors.Count == stubs,
            $"Expected only the errors of {stubs} port stub(s) against the current API:\n" + string.Join("\n", errors)
        );
    }

    /// <summary>
    /// The migrated file, which must parse without errors other than a port stub's <c>#error</c>.
    /// </summary>
    private static async Task<string> ReadMigrated(string path)
    {
        var text = await File.ReadAllTextAsync(path, TestContext.Current.CancellationToken);
        var diagnostics = CSharpSyntaxTree
            .ParseText(text, cancellationToken: TestContext.Current.CancellationToken)
            .GetDiagnostics(TestContext.Current.CancellationToken)
            .Where(static d => d.Severity == DiagnosticSeverity.Error && d.Id != "CS1029")
            .ToList();
        Assert.True(diagnostics.Count == 0, "Migrated file does not parse:\n" + string.Join("\n", diagnostics));
        return text;
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ServiceTasks_TakeTheServiceTaskBuilder_AndEndWithStageOrHandleReplies(bool semantic)
    {
        var tasks = Write(
            "logic/ServiceTasks.cs",
            $$"""
            public class MailboxTask : IServiceTask
            {
                public string Type => "mailbox";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle handle)
                        .HandleReplies(handle, OnReply, OnGone)
                        .Stage(Archive)
                        .Finally(Done);

            {{StageMethods}}
            }

            public class OneStepTask : IServiceTask
            {
                public string Type => "oneStep";

                /// <summary>One step.</summary>
                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    return pipeline.Finally(Done);
                }

            {{StageMethods}}
            }

            public class ConcludingTask : IServiceTask
            {
                public string Type => "concluding";

                ServiceTaskPipeline IServiceTask.DefineExecute(Altinn.App.Core.Features.Process.PipelineBuilder pipeline) =>
                    pipeline.Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle handle).ConcludeOnReplies(handle, OnAnswer, OnTimeout);

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
        Assert.Equal(3, Oks(result).Count);
        Assert.Contains(
            Oks(result),
            ok => ok.Contains("ServiceTasks.cs:10: MailboxTask.DefineExecute takes a PipelineBuilder.ServiceTask")
        );
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(tasks);
        Assert.Contains(
            "    public ServiceTaskPipeline DefineExecute(PipelineBuilder.ServiceTask pipeline) =>\n"
                + "        pipeline\n"
                + "            .Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle handle)\n"
                + "            .HandleReplies(handle, OnReply, OnGone)\n"
                + "            .Stage(Archive)\n"
                + "            .Stage(Done);\n",
            migrated
        );
        Assert.Contains(
            "    /// <summary>One step.</summary>\n"
                + "    public ServiceTaskPipeline DefineExecute(PipelineBuilder.ServiceTask pipeline)\n"
                + "    {\n"
                + "        return pipeline.Stage(Done);\n"
                + "    }\n",
            migrated
        );
        Assert.Contains(
            "    ServiceTaskPipeline IServiceTask.DefineExecute("
                + "Altinn.App.Core.Features.Process.PipelineBuilder.ServiceTask pipeline) =>\n"
                + "        pipeline.Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle handle)"
                + ".HandleReplies(handle, OnAnswer, OnTimeout);\n",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LifecycleMethods_TakeTheLifecycleBuilder_AndReturnNothing(bool semantic)
    {
        var tasks = Write(
            "logic/LifecycleTasks.cs",
            """
            public class SigningTask : IProcessTask
            {
                private readonly bool _skip = DateTime.Now.Year > 3000;

                public string Type => "signing";

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) =>
                    pipeline.Stage(Revoke).Stage(Store).Build();

                public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline)
                {
                    if (_skip)
                        return pipeline.Build();
                    pipeline.Stage(Revoke);
                    if (_skip)
                    {
                        return pipeline.Stage(Store).Build();
                    }

                    // Store last.
                    return pipeline
                        .Stage(Store)
                        .Build();

                    Task<StageResult> Store(StageContext context) => Task.FromResult(StageResult.Completed());
                }

                public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();

                private Task<StageResult> Revoke(StageContext context) => Task.FromResult(StageResult.Completed());

                private Task<StageResult> Store(StageContext context) => Task.FromResult(StageResult.Completed());
            }

            public class IdleTask : IProcessTask
            {
                public string Type => "idle";

                public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline)
                {
                    // Nothing yet.
                    return pipeline.Build();
                }
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
        Assert.Equal(4, Oks(result).Count);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(tasks);
        Assert.Contains(
            "    public void DefineEnd(PipelineBuilder.Lifecycle pipeline) =>\n"
                + "        pipeline.Stage(Revoke).Stage(Store);\n",
            migrated
        );
        Assert.Contains(
            "    public void DefineStart(PipelineBuilder.Lifecycle pipeline)\n"
                + "    {\n"
                + "        if (_skip)\n"
                + "            return;\n"
                + "        pipeline.Stage(Revoke);\n"
                + "        if (_skip)\n"
                + "        {\n"
                + "            pipeline.Stage(Store);\n"
                + "            return;\n"
                + "        }\n"
                + "\n"
                + "        // Store last.\n"
                + "        pipeline\n"
                + "            .Stage(Store);\n"
                + "\n"
                + "        Task<StageResult> Store(StageContext context) => Task.FromResult(StageResult.Completed());\n"
                + "    }\n",
            migrated
        );
        // The same as the interface default, kept so that an override of it or a call to it still compiles.
        Assert.Contains("    public void DefineAbandon(PipelineBuilder.Lifecycle pipeline) { }\n", migrated);
        Assert.Contains(
            "    public void DefineStart(PipelineBuilder.Lifecycle pipeline)\n"
                + "    {\n"
                + "        // Nothing yet.\n"
                + "    }\n",
            migrated
        );
        Assert.DoesNotContain("Build()", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task StatementCompositions_AndHelpers_TakeTheVariantTheyCompose(bool semantic)
    {
        var task = Write(
            "logic/StatementTask.cs",
            $$"""
            public class StatementTask : IServiceTask
            {
                public string Type => "statement";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    PipelineBuilder builder = pipeline.Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle reply);
                    var next = WithArchive(builder).HandleReplies(reply, OnReply, OnGone);
                    PipelineBuilder? last = null;
                    last = next;
                    return last.Finally(Done);
                }

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline)
                {
                    PipelineBuilder builder = pipeline;
                    return WithAudit(builder).Build();
                }

                private static PipelineBuilder WithArchive(PipelineBuilder pipeline) =>
                    pipeline.Stage(static context => Task.FromResult(StageResult.Completed()));

                private PipelineBuilder WithAudit(PipelineBuilder pipeline) => pipeline.Stage(Archive);

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
        Assert.Equal(4, Oks(result).Count);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "        PipelineBuilder.ServiceTask builder = pipeline.Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), "
                + "out MailboxHandle reply);\n"
                + "        var next = WithArchive(builder).HandleReplies(reply, OnReply, OnGone);\n"
                + "        PipelineBuilder.ServiceTask? last = null;\n"
                + "        last = next;\n"
                + "        return last.Stage(Done);\n",
            migrated
        );
        Assert.Contains(
            "        PipelineBuilder.Lifecycle builder = pipeline;\n        WithAudit(builder);\n    }\n",
            migrated
        );
        Assert.Contains(
            "    private static PipelineBuilder.ServiceTask WithArchive(PipelineBuilder.ServiceTask pipeline) =>",
            migrated
        );
        Assert.Contains(
            "    private PipelineBuilder.Lifecycle WithAudit(PipelineBuilder.Lifecycle pipeline) => pipeline.Stage(Archive);",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task FinallyOnAnotherReceiver_IsLeftAlone(bool semantic)
    {
        var task = Write(
            "logic/CleanupTask.cs",
            $$"""
            public sealed class Cleanup
            {
                public Cleanup Finally(Func<StageContext, Task<ServiceTaskResult>> work) => this;

                public Cleanup ConcludeOnReplies(MailboxHandle handle) => this;

                public Cleanup Stage(Func<StageContext, Task<StageResult>> work) => this;
            }

            public class CleanupTask : IServiceTask
            {
                private readonly Cleanup _cleanup = new();

                public string Type => "cleanup";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    _cleanup.Finally(Done);
                    var cleanup = new Cleanup().Stage(Archive);
                    cleanup.Finally(Done).ConcludeOnReplies(new MailboxHandle());
                    return pipeline.Finally(Done);
                }

                public void Run(Cleanup cleanup) => cleanup.Stage(Archive).Finally(Done);

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Single(Oks(result));
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(task);
        Assert.Contains("        _cleanup.Finally(Done);\n", migrated);
        Assert.Contains("        cleanup.Finally(Done).ConcludeOnReplies(new MailboxHandle());\n", migrated);
        Assert.Contains("        return pipeline.Stage(Done);\n", migrated);
        Assert.Contains("    public void Run(Cleanup cleanup) => cleanup.Stage(Archive).Finally(Done);\n", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task HelperForBothKinds_AndAFieldOfTheBuilder_AreReported(bool semantic)
    {
        var task = Write(
            "logic/SharedTask.cs",
            $$"""
            public class SharedTask : IServiceTask
            {
                private PipelineBuilder? _last;

                public string Type => "shared";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => WithArchive(pipeline).Finally(Done);

                public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => WithArchive(pipeline).Build();

                private PipelineBuilder WithArchive(PipelineBuilder pipeline)
                {
                    _last = pipeline;
                    return pipeline.Stage(Archive);
                }

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Warnings);
        Assert.Equal(2, Oks(result).Count);
        Assert.Collection(
            result.Todos,
            helper =>
            {
                Assert.StartsWith(Path.Combine("logic", "SharedTask.cs") + ":16: SharedTask.WithArchive", helper);
                Assert.Contains("it composes both a service task and a lifecycle phase", helper);
            },
            field =>
            {
                Assert.StartsWith(Path.Combine("logic", "SharedTask.cs") + ":8: this PipelineBuilder", field);
                Assert.Contains("cannot be given a variant", field);
            }
        );
        var migrated = await ReadMigrated(task);
        // The callers are rewritten; the helper and the field are left for the developer.
        Assert.Contains(
            "    public ServiceTaskPipeline DefineExecute(PipelineBuilder.ServiceTask pipeline) => "
                + "WithArchive(pipeline).Stage(Done);\n",
            migrated
        );
        Assert.Contains(
            "    public void DefineStart(PipelineBuilder.Lifecycle pipeline) => WithArchive(pipeline);\n",
            migrated
        );
        Assert.Contains("    private PipelineBuilder WithArchive(PipelineBuilder pipeline)\n", migrated);
        Assert.Contains("    private PipelineBuilder? _last;\n", migrated);
    }

    /// <summary>
    /// The stub an earlier studioctl preview wrote, after its final pass shortened the type names.
    /// </summary>
    private const string PreviewStub = """
            public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline)
            {
                #error Port Start to stages in DefineStart as the comment below says, then remove this line.
                // v9 no longer calls Start(string taskId, Instance instance). It runs the stages this method
                // composes when the task starts, inside the process transition and before it commits, and saves and
                // retries each stage on its own. Port the work in Start to stages here, then delete Start.
                // - Give each call to another service its own stage, so that a retry repeats only the stage that failed.
                //
                // return pipeline.Stage(FirstStage).Stage(SecondStage).Build();
            }
        """;

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task PortStubFromAnEarlierUpgrade_BecomesTheCurrentStub(bool errorLineKept)
    {
        var stub = errorLineKept
            ? PreviewStub
            : string.Join('\n', PreviewStub.Split('\n').Where(static line => !line.Contains("#error")));
        var task = Write(
            "logic/LegacyTask.cs",
            $$"""
            public class LegacyTask : IProcessTask
            {
                public string Type => "legacy";

                public Task Start(string taskId, Instance instance) => Task.Delay(1);

            {{stub}}
            }
            """
        );
        var scanner = Scanner(semantic: false);

        var result = new PipelineBuilderVariantMigration(scanner).Migrate(TestContext.Current.CancellationToken);
        var lifecycle = new ProcessTaskLifecycleMigration(scanner).Migrate(TestContext.Current.CancellationToken);

        Assert.Empty(result.Todos);
        Assert.Contains("still stops the build until Start is ported to stages", Assert.Single(Oks(result)));
        // The lifecycle step counts the rewritten stub as the task's DefineStart instead of adding a second.
        Assert.Empty(lifecycle.Todos);
        Assert.Contains("composes DefineStart, which runs instead", Assert.Single(lifecycle.Warnings));
        AssertCompilesAgainstCurrent(stubs: 1);
        var migrated = await ReadMigrated(task);
        Assert.Single(migrated.Split("DefineStart(").Skip(1));
        Assert.Contains(
            "    public Task Start(string taskId, Instance instance) => Task.Delay(1);\n"
                + "\n"
                + "    public void DefineStart(global::Altinn.App.Core.Features.Process.PipelineBuilder.Lifecycle pipeline)\n"
                + "    {\n"
                + "        #error Port Start to stages in DefineStart as the comment below says, then remove this line.\n",
            migrated
        );
        Assert.Contains("        // pipeline.Stage(FirstStage).Stage(SecondStage);\n", migrated);
        Assert.Contains(
            "        throw new global::System.NotImplementedException(\"Port Start to stages in DefineStart, then delete "
                + "the line that throws this exception.\");\n    }\n}",
            migrated
        );
        Assert.DoesNotContain("ProcessTaskPipeline", migrated);
    }

    [Fact]
    public async Task RunningAgain_ChangesAndReportsNothing()
    {
        var files = new[]
        {
            Write(
                "logic/ServiceTask.cs",
                $$"""
                public class MailboxTask : IServiceTask
                {
                    public string Type => "mailbox";

                    public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                    {
                        PipelineBuilder builder = pipeline.Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle reply);
                        return builder.ConcludeOnReplies(reply, OnAnswer, OnTimeout);
                    }

                    public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Stage(Archive).Build();

                    public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();

                {{StageMethods}}
                }
                """
            ),
            Write(
                "logic/LegacyTask.cs",
                $$"""
                public class LegacyTask : IProcessTask
                {
                    public string Type => "legacy";

                    public Task Start(string taskId, Instance instance) => Task.Delay(1);

                {{PreviewStub}}
                }
                """
            ),
        };
        Assert.Equal(4, Oks(Migrate(semantic: false)).Count);
        var once = await Task.WhenAll(files.Select(ReadMigrated));

        var again = Migrate(semantic: false);

        Assert.Empty(again.Messages);
        Assert.Equal(once, await Task.WhenAll(files.Select(ReadMigrated)));

        // With a semantic model of the migrated app, without the stub, which stops the build.
        File.Delete(files[1]);
        Assert.Empty(Migrate(semantic: true, _currentSdk.Value).Messages);
        Assert.Equal(once[0], await ReadMigrated(files[0]));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task PreprocessorDirectives_AroundTheRemovedBuild_AreKept(bool semantic)
    {
        // The upgrade parses with no symbols defined, so a DEBUG-only stage is disabled text, held as trivia of the
        // return or the Build() that the migration removes.
        var task = Write(
            "logic/DebugTask.cs",
            """
            public class DebugTask : IProcessTask
            {
                public string Type => "debug";

                public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline)
                {
                    pipeline.Stage(Revoke);
            #if DEBUG
                    pipeline.Stage(Trace);
            #endif
                    return pipeline.Build();
                }

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Revoke)
            #if DEBUG
                        .Stage(Trace)
            #endif
                        .Build();

                public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline)
                {
                    #region Stages
                    pipeline.Stage(Revoke);
                    #endregion
                    return pipeline.Build();
                }

                private Task<StageResult> Revoke(StageContext context) => Task.FromResult(StageResult.Completed());

                private Task<StageResult> Trace(StageContext context) => Task.FromResult(StageResult.Completed());
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        var migrated = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);
        Assert.Contains("#if DEBUG\n        pipeline.Stage(Trace);\n#endif\n", migrated);
        Assert.Contains("#if DEBUG\n            .Stage(Trace)\n#endif\n", migrated);
        Assert.Contains("        #endregion\n", migrated);
        AssertCompilesAgainstCurrent();
        Assert.Empty(SemanticScannerFactory.CompileErrors(AppFolder, _currentSdk.Value, "DEBUG"));
    }

    [Theory]
    [InlineData("public static class CommonStages", "static", "CommonStages.WithArchive(pipeline)")]
    [InlineData("public abstract class TaskBase", "protected", "base.WithArchive(pipeline)")]
    [InlineData("public static class PipelineExtensions", "static", "pipeline.WithArchive()")]
    public async Task BuilderFromAQualifiedHelperCall_EndsWithStage(string helperClass, string modifier, string call)
    {
        // An app already on v9 has no compilation, so this is the receiver check real apps get.
        var parameter = call.StartsWith("pipeline.", StringComparison.Ordinal) ? "this " : "";
        var task = Write(
            "logic/HelperTask.cs",
            $$"""
            {{helperClass}}
            {
                public {{modifier}} PipelineBuilder WithArchive({{parameter}}PipelineBuilder pipeline) =>
                    pipeline.Stage(static context => Task.FromResult(StageResult.Completed()));
            }

            public class HelperTask : {{(helperClass.Contains("TaskBase") ? "TaskBase, " : "")}}IServiceTask
            {
                public string Type => "helper";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => {{call}}.Finally(Done);

            {{StageMethods}}
            }
            """.Replace("public protected", "protected", StringComparison.Ordinal)
        );

        var result = Migrate(semantic: false);

        // DefineExecute is reported as moved to the service task builder, which has no Finally.
        Assert.Contains(Oks(result), ok => ok.Contains("HelperTask.DefineExecute takes a PipelineBuilder.ServiceTask"));
        var migrated = await ReadMigrated(task);
        Assert.Contains($"=> {call}.Stage(Done);", migrated);
        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void BuilderAsATypeArgument_IsReported(bool semantic)
    {
        Write(
            "logic/ConfigurableTask.cs",
            $$"""
            public class ConfigurableTask : IServiceTask
            {
                private readonly Func<PipelineBuilder, PipelineBuilder> _configure = static pipeline => pipeline;

                public string Type => "configurable";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => _configure(pipeline).Finally(Done);

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        // Neither rewritten nor reported, it fails to compile against the current API with no to-do pointing at it.
        Assert.Contains(
            result.Todos,
            todo => todo.StartsWith(Path.Combine("logic", "ConfigurableTask.cs") + ":8:", StringComparison.Ordinal)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void HelpersOfOneName_InDifferentTasks_TakeTheirOwnTasksVariant(bool semantic)
    {
        Write(
            "logic/TwoTasks.cs",
            $$"""
            public class FirstTask : IServiceTask
            {
                public string Type => "first";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => Compose(pipeline).Finally(Done);

                private PipelineBuilder Compose(PipelineBuilder pipeline) => pipeline.Stage(Archive);

            {{StageMethods}}
            }

            public class SecondTask : IProcessTask
            {
                public string Type => "second";

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => Compose(pipeline).Build();

                private PipelineBuilder Compose(PipelineBuilder pipeline) => pipeline.Stage(Archive);

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        // Each Compose is called by one task only, but both are reported as composing both kinds.
        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ThrowingPlaceholderEnding_CompilesOrIsReported(bool semantic)
    {
        Write(
            "logic/PlaceholderTask.cs",
            $$"""
            public class PlaceholderTask : IServiceTask
            {
                public string Type => "placeholder";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline.Stage(Archive).Finally(_ => throw new NotImplementedException());

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        // Stage(_ => throw ...) fits both the carrying-on and the ending overload: CS0121, and the method is reported
        // as done.
        if (result.Todos.Count == 0)
            AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DirectiveInAReturnOfTheBuilderAlone_IsReported_AndCommentsOfARemovedBuildStay(bool semantic)
    {
        // Without DEBUG the first return is the builder alone, which is removed; with DEBUG it composes a stage, which
        // must stay. No rewrite holds in both, so it is reported.
        var task = Write(
            "logic/DebugTask.cs",
            """
            public class DebugTask : IProcessTask
            {
                public string Type => "debug";

                public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline)
                {
                    return pipeline
            #if DEBUG
                        .Stage(Revoke)
            #endif
                        .Build();
                }

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) =>
                    pipeline.Stage(Revoke) // Revoke last.
                        .Build();

                public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline /* nothing */.Build();

                private Task<StageResult> Revoke(StageContext context) => Task.FromResult(StageResult.Completed());
            }
            """
        );

        var result = Migrate(semantic);

        Assert.StartsWith(
            Path.Combine("logic", "DebugTask.cs")
                + ":10: DebugTask.DefineStart uses preprocessor directives in the "
                + "return at line 12",
            Assert.Single(result.Todos)
        );
        Assert.Equal(2, Oks(result).Count);
        var migrated = await ReadMigrated(task);
        Assert.Contains("        return pipeline\n#if DEBUG\n            .Stage(Revoke)\n#endif\n", migrated);
        Assert.Contains("        pipeline.Stage(Revoke) // Revoke last.\n            ;\n", migrated);
        Assert.Contains(
            "    public void DefineAbandon(PipelineBuilder.Lifecycle pipeline) { /* nothing */ }\n",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ExtensionHelper_OfALifecyclePhase_TakesTheLifecycleBuilder(bool semantic)
    {
        var task = Write(
            "logic/AuditTask.cs",
            """
            public static class AuditStages
            {
                public static PipelineBuilder WithAudit(this PipelineBuilder pipeline) =>
                    pipeline.Stage(static context => Task.FromResult(StageResult.Completed()));
            }

            public class AuditTask : IProcessTask
            {
                public string Type => "audit";

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.WithAudit().Build();
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Equal(2, Oks(result).Count);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "    public void DefineEnd(PipelineBuilder.Lifecycle pipeline) => pipeline.WithAudit();\n",
            migrated
        );
        Assert.Contains(
            "    public static PipelineBuilder.Lifecycle WithAudit(this PipelineBuilder.Lifecycle pipeline) =>\n",
            migrated
        );
    }

    /// <summary>
    /// Migrates the fixture, which must be reported and left as it is, and returns the to-dos.
    /// </summary>
    private async Task<IReadOnlyList<string>> ReportedAndUnchanged(bool semantic, string fixture)
    {
        var task = Write("logic/UnplacedTasks.cs", fixture);
        var original = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Empty(Oks(result));
        Assert.Equal(original, await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken));
        return result.Todos;
    }

    [Fact]
    public async Task FinallyOnAReceiverTheUpgradeCannotFollow_IsReported_NotDone()
    {
        // SharedStages, LibraryTaskBase and the WithArchive extension come from a library the upgrade cannot see, and
        // a field is set elsewhere, so whether the receiver of Finally is the builder cannot be told.
        var todos = await ReportedAndUnchanged(
            semantic: false,
            $$"""
            public class StaticTask : IServiceTask
            {
                public string Type => "static";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    SharedStages.WithArchive(pipeline).Finally(Done);
            }

            public class BaseTask : LibraryTaskBase, IServiceTask
            {
                public string Type => "base";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => base.WithArchive(pipeline).Finally(Done);
            }

            public class ExtensionTask : IServiceTask
            {
                public string Type => "extension";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.WithArchive().Finally(Done);
            }

            public class SavedTask : IServiceTask
            {
                private static PipelineBuilder? _saved;

                public string Type => "saved";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => _saved!.Finally(Done);
            }
            """
        );

        Assert.Collection(
            todos,
            todo =>
                Assert.Contains("StaticTask.DefineExecute uses Finally at line 11 on something it cannot tell", todo),
            todo => Assert.Contains("BaseTask.DefineExecute uses Finally at line 18 on something", todo),
            todo => Assert.Contains("ExtensionTask.DefineExecute uses Finally at line 25 on something", todo),
            todo => Assert.Contains("SavedTask.DefineExecute uses Finally at line 34 on something", todo),
            todo => Assert.Contains("UnplacedTasks.cs:30: this PipelineBuilder is not a parameter or local", todo)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task HelperOnAnInstance_TakesItsCallersVariant_WithASemanticModel(bool semantic)
    {
        var task = Write(
            "logic/InstanceTask.cs",
            $$"""
            public class Stages
            {
                public PipelineBuilder WithArchive(PipelineBuilder pipeline) =>
                    pipeline.Stage(static context => Task.FromResult(StageResult.Completed()));
            }

            public class InstanceTask : IServiceTask
            {
                public string Type => "instance";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    new Stages().WithArchive(pipeline).Finally(Done);

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        if (semantic)
        {
            Assert.Empty(result.Todos);
            AssertCompilesAgainstCurrent();
            Assert.Contains("        new Stages().WithArchive(pipeline).Stage(Done);\n", await ReadMigrated(task));
        }
        else
        {
            // Without one, the call on an instance is not followed: neither method is rewritten.
            Assert.Empty(Oks(result));
            Assert.Collection(
                result.Todos,
                helper =>
                    Assert.Contains("Stages.WithArchive takes or returns a PipelineBuilder, and nothing shows", helper),
                execute => Assert.Contains("InstanceTask.DefineExecute uses Finally at line 17 on something", execute)
            );
        }
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task OldApiTheRulesCannotPlace_IsReported_NotDone(bool semantic)
    {
        var todos = await ReportedAndUnchanged(
            semantic,
            $$"""
            public class ConditionalTask : IServiceTask
            {
                public string Type => "conditional";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline?.Finally(Done)!;

            {{StageMethods}}
            }

            public class ConfiguredTask : IServiceTask
            {
                public string Type => "configured";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    Func<PipelineBuilder, PipelineBuilder> configure = static builder => builder;
                    return configure(pipeline).Stage(Archive).Finally(Done);
                }

            {{StageMethods}}
            }

            public class DebugTask : IServiceTask
            {
                public string Type => "debug";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
            #if DEBUG
                    return pipeline.Finally(Done);
            #else
                    return pipeline.Stage(Archive).Finally(Done);
            #endif
                }

            {{StageMethods}}
            }
            """
        );

        Assert.Collection(
            todos,
            todo => Assert.Contains("ConditionalTask.DefineExecute uses Finally at line 10 on something", todo),
            todo =>
                Assert.Contains(
                    "a PipelineBuilder it cannot give a variant at line 38, "
                        + "a PipelineBuilder it cannot give a variant at line 38, which",
                    Assert.Single(todo.Split("ConfiguredTask.DefineExecute uses ").Skip(1))
                ),
            todo =>
                Assert.Contains(
                    "DebugTask.DefineExecute uses code disabled by a preprocessor directive at line 69 that names",
                    todo
                )
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task WorkWithoutAResultType_GetsOne_OrIsReported(bool semantic)
    {
        // Work that only throws or returns null fits both the step that carries on and the one that ends the task.
        var task = Write(
            "logic/PlaceholderTasks.cs",
            $$"""
            public class PlaceholderTask : IServiceTask
            {
                public string Type => "placeholder";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(static _ => throw new NotImplementedException())
                        .Stage(System.Threading.Tasks.Task<StageResult> (_) => throw new NotImplementedException())
                        .Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle first)
                        .HandleReplies(first, (_, _) => throw new NotImplementedException(), onClosed: async (context, reason) => null)
                        .Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle second)
                        .ConcludeOnReplies(second, OnAnswer, (_, _) => { throw new NotImplementedException(); });

            {{StageMethods}}
            }

            public class QualifiedTask : IServiceTask
            {
                public string Type => "qualified";

                public ServiceTaskPipeline DefineExecute(Altinn.App.Core.Features.Process.PipelineBuilder pipeline) =>
                    pipeline.Finally(_ => default);
            }

            public class AnonymousTask : IServiceTask
            {
                public string Type => "anonymous";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline.Finally(delegate { throw new NotImplementedException(); });
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Equal(2, Oks(result).Count);
        Assert.Contains(
            "AnonymousTask.DefineExecute uses an anonymous method at line 52 whose result has no type",
            Assert.Single(result.Todos)
        );
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "            .Stage(static Task<StageResult> (_) => throw new NotImplementedException())\n"
                + "            .Stage(System.Threading.Tasks.Task<StageResult> (_) => throw new NotImplementedException())\n"
                + "            .Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle first)\n"
                + "            .HandleReplies(first, Task<StageExchangeResult> (_, _) => throw new NotImplementedException(), "
                + "onClosed: async Task<StageResult> (context, reason) => null)\n"
                + "            .Stage(Send, new MailboxOptions(TimeSpan.FromDays(1)), out MailboxHandle second)\n"
                + "            .HandleReplies(second, OnAnswer, Task<ServiceTaskResult> (_, _) => { throw new NotImplementedException(); });\n",
            migrated
        );
        Assert.Contains(
            "        pipeline.Stage(Task<global::Altinn.App.Core.Features.Process.ServiceTaskResult> (_) => default);\n",
            migrated
        );
        Assert.Contains("        pipeline.Finally(delegate { throw new NotImplementedException(); });\n", migrated);
        File.Delete(Path.Combine(AppFolder, "logic", "PlaceholderTasks.cs"));
        Write("logic/PlaceholderTasks.cs", migrated[(Usings.Length + 1)..].Split("public class AnonymousTask")[0]);
        AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DocReferences_ToMethodsTheVariantsLackOrOverload_BecomeCodeSpans(bool semantic)
    {
        var task = Write(
            "logic/DocumentedTask.cs",
            """
            /// <summary>
            /// Ends with <see cref="PipelineBuilder.Finally"/> or <see cref="Altinn.App.Core.Features.Process.PipelineBuilder.ConcludeOnReplies">a concluding exchange</see>,
            /// after <see cref="PipelineBuilder.HandleReplies(MailboxHandle, Func{StageContext, ServiceTaskReply, Task{StageExchangeResult}}, Func{StageContext, MailboxClosedReason, Task{StageResult}}, ProcessStepOptions)"/>.
            /// </summary>
            /// <seealso cref="PipelineBuilder"/>
            public class DocumentedTask : IProcessTask
            {
                public string Type => "documented";

                /// <summary>Returns <see cref="PipelineBuilder.Build"/> of <see cref="PipelineBuilder.Stage"/> calls.</summary>
                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Stage(Revoke).Build();

                private Task<StageResult> Revoke(StageContext context) => Task.FromResult(StageResult.Completed());
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Contains(
            Oks(result),
            ok =>
                ok.StartsWith(
                    Path.Combine("logic", "DocumentedTask.cs") + ": doc comments name",
                    StringComparison.Ordinal
                )
        );
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "/// Ends with <c>Stage</c> or <c>a concluding exchange</c>,\n/// after <c>HandleReplies</c>.\n",
            migrated
        );
        Assert.Contains("/// <seealso cref=\"PipelineBuilder\"/>\n", migrated);
        Assert.Contains(
            "    /// <summary>Returns <c>Build</c> of <c>Stage</c> calls.</summary>\n"
                + "    public void DefineEnd(PipelineBuilder.Lifecycle pipeline) => pipeline.Stage(Revoke);\n",
            migrated
        );
        // With doc comments checked, no reference is left that the current API cannot resolve, or only ambiguously.
        var ct = TestContext.Current.CancellationToken;
        var compilation = SemanticScannerFactory.Compile(AppFolder, _currentSdk.Value);
        var diagnosed = compilation
            .RemoveAllSyntaxTrees()
            .AddSyntaxTrees(
                compilation.SyntaxTrees.Select(tree =>
                    CSharpSyntaxTree.ParseText(
                        tree.GetText(ct),
                        ((CSharpParseOptions)tree.Options).WithDocumentationMode(DocumentationMode.Diagnose),
                        tree.FilePath,
                        cancellationToken: ct
                    )
                )
            );
        Assert.DoesNotContain(diagnosed.GetDiagnostics(ct), static d => d.Id is "CS1574" or "CS0419" or "CS1580");
        Assert.Empty(Migrate(semantic: false).Messages);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task TriviaInAndAfterARemovedBuild_Stays(bool semantic)
    {
        var task = Write(
            "logic/QuietTask.cs",
            """
            public class QuietTask : IProcessTask
            {
                public string Type => "quiet";

                public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline)
                {
                    return pipeline /* nothing */ .Build(); // Nothing yet.
                }

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline)
                {
                    return pipeline
                        .Stage(Revoke)
            #if DEBUG
                        .Stage(Revoke)
            #endif
                        .Build();
                }

                public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) =>
                    pipeline
            #if DEBUG
                        .Stage(Revoke)
            #endif
                        .Build();

                private Task<StageResult> Revoke(StageContext context) => Task.FromResult(StageResult.Completed());
            }
            """
        );

        var result = Migrate(semantic);

        // Without DEBUG the expression body is the builder alone, which becomes an empty body; with DEBUG it composes.
        Assert.Contains(
            "QuietTask.DefineAbandon uses preprocessor directives in an expression body that is only Build()",
            Assert.Single(result.Todos)
        );
        Assert.Equal(2, Oks(result).Count);
        var migrated = await ReadMigrated(task);
        Assert.Contains("    {\n          /* nothing */  // Nothing yet.\n    }\n", migrated);
        Assert.Contains(
            "        pipeline\n            .Stage(Revoke)\n#if DEBUG\n            .Stage(Revoke)\n#endif\n            ;\n    }\n",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void FinallyAsAMethodGroup_IsReportedOrRewritten(bool semantic)
    {
        // pipeline.Finally is not called here, only named, so neither the rename nor the safety net sees it: the method
        // is reported as done and does not compile against the current API.
        Write(
            "logic/GroupTask.cs",
            $$"""
            public class GroupTask : IServiceTask
            {
                public string Type => "group";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    Func<Func<StageContext, Task<ServiceTaskResult>>, ProcessStepOptions?, ServiceTaskPipeline> end =
                        pipeline.Stage(Archive).Finally;
                    return end(Done, null);
                }

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        if (result.Todos.Count == 0)
            AssertCompilesAgainstCurrent();
        else
            Assert.Empty(Oks(result));
    }

    [Theory]
    [InlineData("namespace MyApp\n{\nusing static MyApp.Stages.CommonStages;\n", "}\n")]
    [InlineData("namespace MyApp;\n\nusing static MyApp.Stages.CommonStages;\n", "")]
    public async Task HelperThroughAUsingStaticInANamespace_EndsWithStage(string opening, string closing)
    {
        // A using static inside a namespace declaration, as StyleCop's SA1200 places it, is not looked in.
        Write(
            "logic/Stages.cs",
            """
            namespace MyApp.Stages
            {
                public static class CommonStages
                {
                    public static PipelineBuilder WithArchive(PipelineBuilder pipeline) =>
                        pipeline.Stage(static context => Task.FromResult(StageResult.Completed()));
                }
            }
            """
        );
        var task = Write(
            "logic/StaticTask.cs",
            opening
                + $$"""
                public class StaticTask : IServiceTask
                {
                    public string Type => "static";

                    public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => WithArchive(pipeline).Finally(Done);

                {{StageMethods}}
                }

                """
                + closing
        );

        var result = Migrate(semantic: false);

        Assert.Empty(result.Todos);
        Assert.Contains("=> WithArchive(pipeline).Stage(Done);", await ReadMigrated(task));
        AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData("containing type")]
    [InlineData("base class")]
    [InlineData("using static")]
    [InlineData("global using static")]
    public async Task BareHelperCall_IsFoundWhereCSharpLooks_AndEndsWithStage(string where)
    {
        // Without a compilation, only finding WithArchive by name shows that the receiver of Finally is the builder.
        const string helper = """
                public static PipelineBuilder WithArchive(PipelineBuilder pipeline) =>
                    pipeline.Stage(static context => Task.FromResult(StageResult.Completed()));
            """;
        var bareTask = $$"""
            public class BareTask : {{(where == "base class" ? "TaskBase, " : "")}}IServiceTask
            {
                public string Type => "bare";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => WithArchive(pipeline).Finally(Done);

            {{StageMethods}}
            }
            """;
        var task = where switch
        {
            "containing type" => Write("logic/BareTask.cs", $"public class Outer\n{{\n{helper}\n\n{bareTask}\n}}\n"),
            "base class" => Write(
                "logic/BareTask.cs",
                $"public abstract class TaskBase\n{{\n{helper}\n}}\n\n{bareTask}"
            ),
            "using static" => Write("logic/BareTask.cs", $"using static MyApp.Stages.CommonStages;\n\n{bareTask}"),
            _ => Write("logic/BareTask.cs", bareTask),
        };
        if (where.EndsWith("using static", StringComparison.Ordinal))
        {
            Write(
                "logic/Stages.cs",
                $"namespace MyApp.Stages\n{{\npublic static class CommonStages\n{{\n{helper}\n}}\n}}\n"
            );
        }

        if (where == "global using static")
        {
            _app.Write("logic/GlobalUsings.cs", "global using static MyApp.Stages.CommonStages;\n");
        }

        var result = Migrate(semantic: false);

        Assert.Empty(result.Todos);
        Assert.Contains("=> WithArchive(pipeline).Stage(Done);", await ReadMigrated(task));
        AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task CallOnALocalNamedLikeAType_DoesNotReachThatTypesHelper(bool semantic)
    {
        // Audit.Log on the local is Recorder.Log, so the helper Audit.Log is part of DefineEnd's lifecycle phase only.
        var task = Write(
            "logic/AuditedTask.cs",
            $$"""
            public static class Audit
            {
                public static PipelineBuilder Log(PipelineBuilder pipeline) =>
                    pipeline.Stage(static context => Task.FromResult(StageResult.Completed()));
            }

            public sealed class Recorder
            {
                public void Log(object value) { }
            }

            public class AuditedTask : IServiceTask
            {
                public string Type => "audited";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    var Audit = new Recorder();
                    Audit.Log(pipeline);
                    return pipeline.Finally(Done);
                }

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => Audit.Log(pipeline).Build();

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Contains(
            "    public static PipelineBuilder.Lifecycle Log(PipelineBuilder.Lifecycle pipeline) =>\n",
            await ReadMigrated(task)
        );
        AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData("nameof(pipeline.ConcludeOnReplies)", true)]
    [InlineData("nameof(pipeline.ConcludeOnReplies)", false)]
    [InlineData("nameof(PipelineBuilder.Build)", true)]
    [InlineData("nameof(PipelineBuilder.Build)", false)]
    [InlineData("nameof(Report.Build)", true)]
    [InlineData("nameof(Report.Build)", false)]
    public async Task MethodGroupOfTheBuilder_IsReported_NotDone_AndOfAnotherType_IsLeftAlone(
        string named,
        bool semantic
    )
    {
        var task = Write(
            "logic/NamingTask.cs",
            $$"""
            public sealed class Report
            {
                public string Build() => "";
            }

            public class NamingTask : IServiceTask
            {
                public string Type => "naming";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    Console.WriteLine({{named}});
                    return pipeline.Finally(Done);
                }

            {{StageMethods}}
            }
            """
        );
        var original = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        if (named.Contains("Report", StringComparison.Ordinal))
        {
            Assert.Empty(result.Todos);
            Assert.Contains("        return pipeline.Stage(Done);\n", await ReadMigrated(task));
            AssertCompilesAgainstCurrent();
        }
        else
        {
            Assert.Empty(Oks(result));
            Assert.Contains(
                $"NamingTask.DefineExecute uses {named.Split('.')[^1].TrimEnd(')')} at line 17 as a method group",
                Assert.Single(result.Todos)
            );
            Assert.Equal(original, await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken));
        }
    }

    [Fact]
    public async Task FinallyOnACallHoldingAHelperCall_IsReported_NotDone()
    {
        // Wrap is not one of the app's pipeline methods, so what it returns cannot be told, but it is handed the
        // builder Prepared returns.
        var todos = await ReportedAndUnchanged(
            semantic: false,
            $$"""
            public class WrappedTask : IServiceTask
            {
                public string Type => "wrapped";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => Wrap(Prepared()).Finally(Done);

                private static PipelineBuilder Prepared() => new();

                private static T Wrap<T>(T value) => value;

            {{StageMethods}}
            }
            """
        );

        Assert.Collection(
            todos,
            todo =>
                Assert.Contains("WrappedTask.DefineExecute uses Finally at line 10 on something it cannot tell", todo),
            todo => Assert.Contains("WrappedTask.Prepared takes or returns a PipelineBuilder, and nothing shows", todo)
        );
    }
}
