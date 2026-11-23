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
}
