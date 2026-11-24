using Altinn.Studio.Cli.Upgrade;
using Altinn.Studio.Cli.Upgrade.v8Tov9;
using Altinn.Studio.Cli.Upgrade.v8Tov9.CSharpApiMigration;
using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;

namespace Studioctl.Tests.Upgrade.v8Tov9;

/// <summary>
/// Covers moving pipelines written for an earlier v9 preview to the current API. Each fixture compiles against a
/// stand-in of the preview's API and, once migrated, against a stand-in of the current one, where <c>Finally</c>,
/// <c>HandleReplies</c>, <c>ConcludeOnReplies</c>, <c>Build</c>, the mailbox types and the exchange results no longer
/// exist. Most cases run both with a semantic model (the app compiled against the preview) and without, which is how
/// the upgrade sees an app already on v9.
/// </summary>
public sealed class PreviewPipelineMigrationTests : IDisposable
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

    private const string PreviewApi = """
                public abstract record StageExchangeResult
                {
                    public static StageAwaitNextReplyResult AwaitNextReply() => new();
                }

                public sealed record StageAwaitNextReplyResult : StageExchangeResult;

                public abstract record StageResult : StageExchangeResult
                {
                    public static StageResult Completed() => new CompletedStageResult();

                    public static StageResult FailedPermanent(string errorMessage) => new CompletedStageResult();
                }

                public sealed record CompletedStageResult : StageResult;

                public abstract record ServiceTaskExchangeResult
                {
                    public static ServiceTaskAwaitNextReplyResult AwaitNextReply() => new();
                }

                public sealed record ServiceTaskAwaitNextReplyResult : ServiceTaskExchangeResult;

                public abstract record ServiceTaskResult : ServiceTaskExchangeResult
                {
                    public static SuccessfulServiceTaskResult Success(string? action = null) => new() { Action = action };

                    public static FailedServiceTaskResult FailedPermanent(string errorMessage) => new();

                    public static DeferredServiceTaskResult Defer(TimeSpan delay, string? reason = null) => new();
                }

                public sealed record SuccessfulServiceTaskResult : ServiceTaskResult
                {
                    public string? Action { get; init; }
                }

                public sealed record FailedServiceTaskResult : ServiceTaskResult;

                public sealed record DeferredServiceTaskResult : ServiceTaskResult;

                public abstract record ServiceTaskOpeningStageResult
                {
                    public static ServiceTaskOpeningStageResult Completed() => new SentResult();

                    public static ServiceTaskOpeningStageResult FailedPermanent(string errorMessage) => new SentResult();

                    public static ServiceTaskOpeningStageResult Conclude(ServiceTaskResult result) => new SentResult();
                }

                public sealed record SentResult : ServiceTaskOpeningStageResult;

                public sealed record ServiceTaskMailbox
                {
                    public Guid Id { get; init; }

                    public DateTimeOffset Deadline { get; init; }
                }

                public enum MailboxClosedReason
                {
                    Request,
                    Deadline,
                }

                public sealed record MailboxOptions
                {
                    public required TimeSpan Timeout { get; init; }
                }

                public sealed class MailboxHandle { }

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

                public interface IServiceTask : IProcessTask
                {
                    ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline);
                }

                public enum ServiceTaskReplyForwardOutcome
                {
                    Unroutable,
                    MailboxFull,
                }

                public sealed class ServiceTaskReplyForwardException(
                    ServiceTaskReplyForwardOutcome outcome,
                    Guid mailboxId,
                    string message
                ) : Exception(message)
                {
                    public ServiceTaskReplyForwardOutcome Outcome { get; } = outcome;

                    public Guid MailboxId { get; } = mailboxId;
                }

                public interface IServiceTaskReplyForwarder
                {
                    Task ForwardReply(Guid mailboxId, string serviceTaskType, string payload, string idempotencyKey);
                }
        """;

    private const string CurrentApi = """
                public abstract record StageResult
                {
                    public static StageResult Completed() => new CompletedStageResult();

                    public static StageResult FailedPermanent(string errorMessage) => new CompletedStageResult();
                }

                public sealed record CompletedStageResult : StageResult;

                public abstract record ServiceTaskReplyResult
                {
                    public static ServiceTaskReplyResult AwaitNextReply() => new ServiceTaskAwaitNextReplyResult();

                    public static ServiceTaskReplyResult Completed() => new CompletedServiceTaskResult();

                    public static ServiceTaskReplyResult EndTask(string? action = null) => new EndedServiceTaskResult();

                    public static ServiceTaskReplyResult FailedPermanent(string errorMessage) => new FailedServiceTaskResult();
                }

                public sealed record ServiceTaskAwaitNextReplyResult : ServiceTaskReplyResult;

                public abstract record ServiceTaskResult : ServiceTaskReplyResult
                {
                    public static new ServiceTaskResult Completed() => new CompletedServiceTaskResult();

                    public static new ServiceTaskResult EndTask(string? action = null) =>
                        new EndedServiceTaskResult { Action = action };

                    public static new ServiceTaskResult FailedPermanent(string errorMessage) => new FailedServiceTaskResult();

                    public static ServiceTaskResult Defer(TimeSpan delay, string? reason = null) =>
                        new DeferredServiceTaskResult();
                }

                public sealed record CompletedServiceTaskResult : ServiceTaskResult;

                public sealed record EndedServiceTaskResult : ServiceTaskResult
                {
                    public string? Action { get; init; }
                }

                public sealed record FailedServiceTaskResult : ServiceTaskResult;

                public sealed record DeferredServiceTaskResult : ServiceTaskResult;

                public sealed record ReplyAddress
                {
                    public Guid Id { get; init; }

                    public DateTimeOffset Deadline { get; init; }
                }

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
                        public ServiceTask Stage(
                            Func<StageContext, Task<ServiceTaskResult>> work,
                            ProcessStepOptions? options = null
                        ) => this;

                        public ServiceTask ExternalStage(
                            Func<StageContext, ReplyAddress, Task<ServiceTaskResult>> send,
                            Func<StageContext, ServiceTaskReply, Task<ServiceTaskReplyResult>> onReply,
                            TimeSpan? timeout = null,
                            Func<StageContext, Task<ServiceTaskResult>>? onTimeout = null,
                            ProcessStepOptions? options = null
                        ) => this;
                    }
                }

                public interface IServiceTask : IProcessTask
                {
                    void DefineExecute(PipelineBuilder.ServiceTask pipeline);
                }

                public enum ServiceTaskReplyForwardOutcome
                {
                    Unroutable,
                    TooManyReplies,
                }

                public sealed class ServiceTaskReplyForwardException(
                    ServiceTaskReplyForwardOutcome outcome,
                    Guid replyAddressId,
                    string message
                ) : Exception(message)
                {
                    public ServiceTaskReplyForwardOutcome Outcome { get; } = outcome;

                    public Guid ReplyAddressId { get; } = replyAddressId;
                }

                public interface IServiceTaskReplyForwarder
                {
                    Task ForwardReply(Guid replyAddressId, string serviceTaskType, string payload, string idempotencyKey);
                }
        """;

    /// <summary>
    /// The pipeline surface of the App library in the preview's shape or the current one.
    /// </summary>
    private static string SdkStub(bool current)
    {
        var (api, lifecycleMembers) = current
            ? (
                CurrentApi,
                """
                        void DefineStart(PipelineBuilder.Lifecycle pipeline) { }
                        void DefineEnd(PipelineBuilder.Lifecycle pipeline) { }
                        void DefineAbandon(PipelineBuilder.Lifecycle pipeline) { }
                """
            )
            : (
                PreviewApi,
                """
                        ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) => pipeline.Build();
                        ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Build();
                        ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();
                """
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

                public sealed record ServiceTaskReply
                {
                    public string Payload { get; init; } = "";
                }

                public sealed record ProcessStepOptions
                {
                    public TimeSpan? WaitBudget { get; init; }
                }

            {{api}}
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
    /// A plain stage and a <c>Finally</c>'s work, in the shapes the preview builder takes.
    /// </summary>
    private const string StageMethods = """
            private Task<StageResult> Archive(StageContext context) => Task.FromResult(StageResult.Completed());

            private Task<ServiceTaskResult> Done(StageContext context) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Defer(TimeSpan.FromMinutes(1)));
        """;

    /// <summary>
    /// A send, and the handlers of a <c>HandleReplies</c> that carries on after the replies.
    /// </summary>
    private const string CarryOnExchange = """
            private Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                Task.FromResult(ServiceTaskOpeningStageResult.Completed());

            private Task<StageExchangeResult> OnReply(StageContext context, ServiceTaskReply reply) =>
                Task.FromResult<StageExchangeResult>(StageExchangeResult.AwaitNextReply());

            private Task<StageResult> OnGone(StageContext context, MailboxClosedReason reason) =>
                Task.FromResult(StageResult.Completed());
        """;

    /// <summary>
    /// A send, and the handlers of a <c>ConcludeOnReplies</c> that ends the task.
    /// </summary>
    private const string ConcludingExchange = """
            private Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                Task.FromResult(ServiceTaskOpeningStageResult.Completed());

            private Task<ServiceTaskExchangeResult> OnAnswer(StageContext context, ServiceTaskReply reply) =>
                Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

            private Task<ServiceTaskResult> OnTimeout(StageContext context, MailboxClosedReason reason) =>
                Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("No answer."));
        """;

    private CSharpSourceScanner Scanner(bool semantic, MetadataReference? sdk = null) =>
        semantic ? SemanticScannerFactory.CreateScanner(AppFolder, sdk ?? _previewSdk.Value) : new(AppFolder);

    private MigrationResult Migrate(bool semantic, MetadataReference? sdk = null) =>
        new PreviewPipelineMigration(Scanner(semantic, sdk)).Migrate(TestContext.Current.CancellationToken);

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

    /// <summary>
    /// The <c>DefineExecute</c> methods in the file, as written.
    /// </summary>
    private static string[] Compositions(string text) =>
        [
            .. CSharpSyntaxTree
                .ParseText(text, cancellationToken: TestContext.Current.CancellationToken)
                .GetRoot(TestContext.Current.CancellationToken)
                .DescendantNodes()
                .OfType<Microsoft.CodeAnalysis.CSharp.Syntax.MethodDeclarationSyntax>()
                .Where(static method => method.Identifier.ValueText == "DefineExecute")
                .Select(static method => method.ToFullString()),
        ];

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

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ServiceTasks_TakeTheServiceTaskBuilder_AndReturnNothing(bool semantic)
    {
        var tasks = Write(
            "logic/ServiceTasks.cs",
            $$"""
            public class MailboxTask : IServiceTask
            {
                public string Type => "mailbox";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out MailboxHandle handle)
                        .HandleReplies(handle, OnReply, OnGone)
                        .Stage(Archive)
                        .Finally(Done);

            {{StageMethods}}

            {{CarryOnExchange}}
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
                    pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out MailboxHandle handle).ConcludeOnReplies(handle, OnAnswer, OnTimeout);

            {{ConcludingExchange}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
        Assert.Contains(
            Oks(result),
            ok =>
                ok.Contains(
                    "ServiceTasks.cs:10: MailboxTask.DefineExecute takes a PipelineBuilder.ServiceTask and returns "
                        + "nothing, with Finally as Stage, with each send and its reply handler as one ExternalStage."
                )
        );
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(tasks);
        Assert.Contains(
            "    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>\n"
                + "        pipeline\n"
                + "            .ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(1), onTimeout: OnGone)\n"
                + "            .Stage(Archive)\n"
                + "            .Stage(Done);\n",
            migrated
        );
        Assert.Contains(
            "    /// <summary>One step.</summary>\n"
                + "    public void DefineExecute(PipelineBuilder.ServiceTask pipeline)\n"
                + "    {\n"
                + "        pipeline.Stage(Done);\n"
                + "    }\n",
            migrated
        );
        Assert.Contains(
            "    void IServiceTask.DefineExecute("
                + "Altinn.App.Core.Features.Process.PipelineBuilder.ServiceTask pipeline) =>\n"
                + "        pipeline.ExternalStage(Send, OnAnswer, timeout: TimeSpan.FromDays(1), onTimeout: OnTimeout);\n",
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
                    PipelineBuilder builder = WithArchive(pipeline);
                    var next = builder.Stage(Archive);
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

                private PipelineBuilder WithAudit(PipelineBuilder pipeline) => pipeline.Stage(Audit);

                private Task<StageResult> Audit(StageContext context) => Task.FromResult(StageResult.Completed());

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Empty(result.Warnings);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "        PipelineBuilder.ServiceTask builder = WithArchive(pipeline);\n"
                + "        var next = builder.Stage(Archive);\n"
                + "        PipelineBuilder.ServiceTask? last = null;\n"
                + "        last = next;\n"
                + "        last.Stage(Done);\n",
            migrated
        );
        Assert.Contains(
            "        PipelineBuilder.Lifecycle builder = pipeline;\n        WithAudit(builder);\n    }\n",
            migrated
        );
        Assert.Contains(
            "    private static PipelineBuilder.ServiceTask WithArchive(PipelineBuilder.ServiceTask pipeline) =>\n"
                + "        pipeline.Stage(static context => Task.FromResult(ServiceTaskResult.Completed()));\n",
            migrated
        );
        Assert.Contains(
            "    private PipelineBuilder.Lifecycle WithAudit(PipelineBuilder.Lifecycle pipeline) => pipeline.Stage(Audit);",
            migrated
        );
        Assert.Contains(
            "    private Task<StageResult> Audit(StageContext context) => Task.FromResult(StageResult.Completed());",
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

                public Cleanup ConcludeOnReplies(int handle) => this;

                public Cleanup HandleReplies(int handle) => this;

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
                    cleanup.Finally(Done).ConcludeOnReplies(1).HandleReplies(2);
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
        Assert.Contains("        cleanup.Finally(Done).ConcludeOnReplies(1).HandleReplies(2);\n", migrated);
        Assert.Contains("        pipeline.Stage(Done);\n", migrated);
        Assert.Contains("    public void Run(Cleanup cleanup) => cleanup.Stage(Archive).Finally(Done);\n", migrated);
        // Archive is only ever a stage of Cleanup, which the upgrade leaves alone.
        Assert.Contains("    private Task<StageResult> Archive(StageContext context)", migrated);
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
            "    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => WithArchive(pipeline).Stage(Done);\n",
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

        var result = new PreviewPipelineMigration(scanner).Migrate(TestContext.Current.CancellationToken);
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

        // Each Compose, and each Archive, is part of one task's pipeline only.
        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void ThrowingPlaceholderStage_Compiles(bool semantic)
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

        // The service task builder has one Stage, so work without a result type of its own fits it.
        Assert.Empty(result.Todos);
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
                + ":10: DebugTask.DefineStart has preprocessor directives in the "
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
                Assert.Contains("StaticTask.DefineExecute has Finally at line 11 on something it cannot tell", todo),
            todo => Assert.Contains("BaseTask.DefineExecute has Finally at line 18 on something", todo),
            todo => Assert.Contains("ExtensionTask.DefineExecute has Finally at line 25 on something", todo),
            todo => Assert.Contains("SavedTask.DefineExecute has Finally at line 34 on something", todo),
            todo =>
                Assert.EndsWith(
                    "UnplacedTasks.cs:30: this PipelineBuilder is not a parameter or local of a method that composes a "
                        + "pipeline, so it cannot be given a variant. Use PipelineBuilder.ServiceTask for a service task's "
                        + "or PipelineBuilder.Lifecycle for DefineStart, DefineEnd and DefineAbandon.",
                    todo
                )
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
                execute => Assert.Contains("InstanceTask.DefineExecute has Finally at line 17 on something", execute)
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
            todo =>
                Assert.Contains(
                    "ConditionalTask.DefineExecute has an expression body that is not a composed pipeline; Finally at line 10 on something",
                    todo
                ),
            todo =>
                Assert.Contains(
                    "a PipelineBuilder it cannot give a variant at line 24; "
                        + "a PipelineBuilder it cannot give a variant at line 24, so",
                    Assert.Single(todo.Split("ConfiguredTask.DefineExecute has ").Skip(1))
                ),
            todo =>
                Assert.Contains(
                    "DebugTask.DefineExecute has code disabled by a preprocessor directive at line 41 that names",
                    todo
                )
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task DocReferences_ToTheRemovedApi_BecomeCodeSpans(bool semantic)
    {
        var task = Write(
            "logic/DocumentedTask.cs",
            """
            /// <summary>
            /// Ends with <see cref="PipelineBuilder.Finally"/> or <see cref="Altinn.App.Core.Features.Process.PipelineBuilder.ConcludeOnReplies">a concluding exchange</see>,
            /// after <see cref="PipelineBuilder.HandleReplies(MailboxHandle, Func{StageContext, ServiceTaskReply, Task{StageExchangeResult}}, Func{StageContext, MailboxClosedReason, Task{StageResult}}, ProcessStepOptions)"/>,
            /// waiting <see cref="MailboxOptions.Timeout"/> for a <see cref="ServiceTaskMailbox"/>.
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
            "/// Ends with <c>Stage</c> or <c>a concluding exchange</c>,\n/// after <c>ExternalStage</c>,\n"
                + "/// waiting <c>MailboxOptions.Timeout</c> for a <see cref=\"ReplyAddress\"/>.\n",
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
            "QuietTask.DefineAbandon has preprocessor directives in an expression body that is only Build()",
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
    public void FinallyAsAMethodGroup_IsReported(bool semantic)
    {
        // pipeline.Finally is not called here, only named, and the current builder has no Finally to name.
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

        Assert.Empty(Oks(result));
        Assert.Contains("Finally at line 13 as a method group", Assert.Single(result.Todos));
    }

    [Theory]
    [InlineData("namespace MyApp\n{\nusing static MyApp.Stages.CommonStages;\n", "}\n")]
    [InlineData("namespace MyApp;\n\nusing static MyApp.Stages.CommonStages;\n", "")]
    public async Task HelperThroughAUsingStaticInANamespace_EndsWithStage(string opening, string closing)
    {
        // A using static inside a namespace declaration, as StyleCop's SA1200 places it, is looked in too.
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
            Assert.Contains("        pipeline.Stage(Done);\n", await ReadMigrated(task));
            AssertCompilesAgainstCurrent();
        }
        else
        {
            Assert.Empty(Oks(result));
            Assert.Contains(
                $"NamingTask.DefineExecute has {named.Split('.')[^1].TrimEnd(')')} at line 17 as a method group",
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
                Assert.Contains("WrappedTask.DefineExecute has Finally at line 10 on something it cannot tell", todo),
            todo => Assert.Contains("WrappedTask.Prepared takes or returns a PipelineBuilder, and nothing shows", todo)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MailboxPairInOneChain_BecomesOneExternalStage_LaidOutAsTheSendWas(bool semantic)
    {
        var task = Write(
            "logic/ArchiveTask.cs",
            $$"""
            public class ArchiveTask : IServiceTask
            {
                public string Type => "archive";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Archive)
                        .Stage(
                            Send,
                            // Long enough for the archive.
                            new MailboxOptions { Timeout = TimeSpan.FromMinutes(20) },
                            out MailboxHandle archive
                        )
                        .HandleReplies(archive, onMessage: OnReply, onClosed: OnGone)
                        .Finally(Done);

            {{StageMethods}}

            {{CarryOnExchange}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
        Assert.Contains(
            "    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) =>\n"
                + "        pipeline\n"
                + "            .Stage(Archive)\n"
                + "            .ExternalStage(\n"
                + "                Send,\n"
                + "                OnReply,\n"
                + "                // Long enough for the archive.\n"
                + "                timeout: TimeSpan.FromMinutes(20),\n"
                + "                onTimeout: OnGone\n"
                + "            )\n"
                + "            .Stage(Done);\n",
            await ReadMigrated(task)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MailboxPairAcrossTwoStatements_BecomesOneExternalStage_WhereTheSendWas(bool semantic)
    {
        var task = Write(
            "logic/SplitTasks.cs",
            $$"""
            public class SplitTask : IServiceTask
            {
                public string Type => "split";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    pipeline.Stage(Archive);
                    // Send to the archive.
                    pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var archive);
                    pipeline.HandleReplies(archive, OnReply, OnGone);
                    return pipeline.Finally(Done);
                }

            {{StageMethods}}

            {{CarryOnExchange}}
            }

            public class DeclaredTask : IServiceTask
            {
                public string Type => "declared";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    var sent = pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out MailboxHandle answer);
                    return sent.ConcludeOnReplies(answer, OnAnswer, OnTimeout);
                }

            {{ConcludingExchange}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "    public void DefineExecute(PipelineBuilder.ServiceTask pipeline)\n"
                + "    {\n"
                + "        pipeline.Stage(Archive);\n"
                + "        // Send to the archive.\n"
                + "        pipeline.ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(1), onTimeout: OnGone);\n"
                + "        pipeline.Stage(Done);\n"
                + "    }\n",
            migrated
        );
        Assert.Contains(
            "    public void DefineExecute(PipelineBuilder.ServiceTask pipeline)\n"
                + "    {\n"
                + "        var sent = pipeline.ExternalStage(Send, OnAnswer, timeout: TimeSpan.FromDays(1), "
                + "onTimeout: OnTimeout);\n"
                + "    }\n",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Timeout_ComesFromMailboxOptionsWrittenInTheSend_AndAHeldValueIsReported(bool semantic)
    {
        var task = Write(
            "logic/TimeoutTasks.cs",
            $$"""
            public class TargetTypedTask : IServiceTask
            {
                public string Type => "targetTyped";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline.Stage(Send, new() { Timeout = TimeSpan.FromHours(6) }, out var handle).ConcludeOnReplies(handle, OnAnswer, OnTimeout);

            {{ConcludingExchange}}
            }

            public class HeldTask : IServiceTask
            {
                private static readonly MailboxOptions _mailbox = new() { Timeout = TimeSpan.FromDays(1) };

                public string Type => "held";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline.Stage(Send, _mailbox, out var handle).ConcludeOnReplies(handle, OnAnswer, OnTimeout);

            {{ConcludingExchange}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Contains(
            "        pipeline.ExternalStage(Send, OnAnswer, timeout: TimeSpan.FromHours(6), onTimeout: OnTimeout);\n",
            await ReadMigrated(task)
        );
        Assert.Contains(
            result.Todos,
            todo =>
                todo.StartsWith(
                    Path.Combine("logic", "TimeoutTasks.cs")
                        + ":29: HeldTask.DefineExecute has the MailboxOptions of "
                        + "the send at line 30, whose timeout is not written in the call as new MailboxOptions { Timeout = ... }",
                    StringComparison.Ordinal
                )
        );
        // The field is reported as what is left of the preview's API, with its own line.
        Assert.Contains(
            Path.Combine("logic", "TimeoutTasks.cs")
                + ":25: MailboxOptions was removed. Give ExternalStage the timeout "
                + "as timeout:.",
            result.Todos
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task OnClosed_ThatIgnoresItsReason_BecomesOnTimeout_AsAMethodGroupOrALambda(bool semantic)
    {
        var task = Write(
            "logic/TimeoutTasks.cs",
            $$"""
            public class LambdaTask : IServiceTask
            {
                public string Type => "lambda";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var first)
                        .HandleReplies(first, OnReply, (context, reason) => Task.FromResult(StageResult.Completed()))
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var second)
                        .HandleReplies(second, OnReply, static async (_, _) => StageResult.FailedPermanent("No reply."))
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var fourth)
                        .HandleReplies(fourth, OnReply, OnGone)
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var third)
                        .ConcludeOnReplies(third, OnAnswer, delegate (StageContext context, MailboxClosedReason reason) { return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()); });

                private Task<ServiceTaskExchangeResult> OnAnswer(StageContext context, ServiceTaskReply reply) =>
                    Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

            {{CarryOnExchange}}
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "            .ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(1), onTimeout: context => "
                + "Task.FromResult(ServiceTaskResult.Completed()))\n"
                + "            .ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(1), onTimeout: static async _ => "
                + "ServiceTaskResult.FailedPermanent(\"No reply.\"))\n"
                + "            .ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(1), onTimeout: OnGone)\n"
                + "            .ExternalStage(Send, OnAnswer, timeout: TimeSpan.FromDays(1), onTimeout: delegate "
                + "(StageContext context) { return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.EndTask()); });\n",
            migrated
        );
        // A method group loses its reason too.
        Assert.Contains(
            "    private Task<ServiceTaskResult> OnGone(StageContext context) =>\n"
                + "        Task.FromResult(ServiceTaskResult.Completed());\n",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task OnClosed_ThatUsesItsReason_IsReported_AsTheMethodOrTheComposition(bool semantic)
    {
        var task = Write(
            "logic/ReasonTasks.cs",
            $$"""
            public class MethodTask : IServiceTask
            {
                public string Type => "method";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle).ConcludeOnReplies(handle, OnAnswer, OnClosed);

                private Task<ServiceTaskResult> OnClosed(StageContext context, MailboxClosedReason reason) =>
                    Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent($"Closed: {reason}."));

                private Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                    Task.FromResult(ServiceTaskOpeningStageResult.Completed());

                private Task<ServiceTaskExchangeResult> OnAnswer(StageContext context, ServiceTaskReply reply) =>
                    Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());
            }

            public class LambdaTask : IServiceTask
            {
                public string Type => "lambda";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle)
                        .HandleReplies(handle, OnReply, (context, reason) => Task.FromResult(StageResult.FailedPermanent($"{reason}")))
                        .Finally(Done);

            {{StageMethods}}

            {{CarryOnExchange}}
            }
            """
        );
        var result = Migrate(semantic);

        var migrated = await ReadMigrated(task);
        // The composition is rewritten, and the method that cannot lose its reason is reported and left as it is.
        Assert.Contains(
            "        pipeline.ExternalStage(Send, OnAnswer, timeout: TimeSpan.FromDays(1), onTimeout: OnClosed);\n",
            migrated
        );
        Assert.Contains(
            Path.Combine("logic", "ReasonTasks.cs")
                + ":13: MethodTask.OnClosed uses its MailboxClosedReason, which "
                + "onTimeout is not given, so its result type and parameters were not rewritten. Make it a method that returns "
                + "Task<ServiceTaskResult> and takes only the StageContext: onTimeout runs when the timeout passes.",
            result.Todos
        );
        Assert.Contains(
            "    private Task<ServiceTaskResult> OnClosed(StageContext context, MailboxClosedReason reason) =>\n",
            migrated
        );
        // A lambda is part of its composition, which is reported and left as it is, with its own steps.
        Assert.Contains(
            result.Todos,
            todo =>
                todo.StartsWith(
                    Path.Combine("logic", "ReasonTasks.cs")
                        + ":27: LambdaTask.DefineExecute has an "
                        + "onClosed at line 30 that uses its MailboxClosedReason",
                    StringComparison.Ordinal
                )
        );
        Assert.Contains(
            "            .HandleReplies(handle, OnReply, (context, reason) => "
                + "Task.FromResult(StageResult.FailedPermanent($\"{reason}\")))\n",
            migrated
        );
        // The reported method's reason is what is left of the preview's API, which a rerun reports too; the reported
        // composition's to-do covers its lambda.
        Assert.Contains(
            result.Todos,
            todo => todo.Contains(":13: MailboxClosedReason was removed", StringComparison.Ordinal)
        );
        Assert.DoesNotContain(
            result.Todos,
            todo => todo.Contains(":30: MailboxClosedReason", StringComparison.Ordinal)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Options_GivenOnceOrAlike_AreKept_AndOptionsThatDiffer_AreReported(bool semantic)
    {
        const string options = """
                private static readonly ProcessStepOptions Patient = new() { WaitBudget = TimeSpan.FromMinutes(5) };

                private static readonly ProcessStepOptions Hasty = new() { WaitBudget = TimeSpan.FromSeconds(5) };
            """;
        var task = Write(
            "logic/OptionsTasks.cs",
            $$"""
            public class OptionsTask : IServiceTask
            {
                public string Type => "options";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var first, Patient)
                        .HandleReplies(first, OnReply, OnGone)
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var second)
                        .HandleReplies(second, OnReply, OnGone, options: Patient)
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var third, options: Patient)
                        .HandleReplies(third, OnReply, OnGone, Patient)
                        .Finally(Done);

            {{options}}

            {{StageMethods}}

            {{CarryOnExchange}}
            }

            public class DifferingTask : IServiceTask
            {
                public string Type => "differing";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle, Patient)
                        .HandleReplies(handle, OnReply, OnGone, Hasty)
                        .Finally(Done);

            {{options}}

            {{StageMethods}}

            {{CarryOnExchange}}
            }
            """
        );

        var result = Migrate(semantic);

        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "            .ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(1), onTimeout: OnGone, options: Patient)\n"
                + "            .ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(1), onTimeout: OnGone, options: Patient)\n"
                + "            .ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(1), onTimeout: OnGone, options: Patient)\n"
                + "            .Stage(Done);\n",
            migrated
        );
        // The lines are those of the file as the upgrade leaves it, where OptionsTask above has fewer.
        var lines = migrated.Split('\n');
        int LineOf(string text) => Array.FindIndex(lines, line => line.Contains(text, StringComparison.Ordinal)) + 1;
        var differing =
            Path.Combine("logic", "OptionsTasks.cs")
            + $":{LineOf("public class DifferingTask") + 4}: DifferingTask.DefineExecute has options at lines "
            + $"{LineOf("out var handle, Patient)")} and {LineOf("OnGone, Hasty)")} that differ, where ExternalStage "
            + "takes one for the send and each reply, so it was left as it is.";
        Assert.Contains(result.Todos, todo => todo.StartsWith(differing, StringComparison.Ordinal));
        // Three lines up from where it was before the upgrade.
        Assert.Equal(40, LineOf("public class DifferingTask") + 4);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task HandlerThatDoesNotDirectlyFollowItsSend_IsReported_NotDone(bool semantic)
    {
        var task = Write(
            "logic/OrderTasks.cs",
            $$"""
            public class BetweenTask : IServiceTask
            {
                public string Type => "between";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle)
                        .Stage(Archive)
                        .HandleReplies(handle, OnReply, OnGone)
                        .Finally(Done);

            {{StageMethods}}

            {{CarryOnExchange}}
            }

            public class UpfrontTask : IServiceTask
            {
                public string Type => "upfront";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var alpha)
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var beta)
                        .HandleReplies(alpha, OnReply, OnGone)
                        .HandleReplies(beta, OnReply, OnGone)
                        .Finally(Done);

            {{StageMethods}}

            {{CarryOnExchange}}
            }

            public class SplitTask : IServiceTask
            {
                public string Type => "split";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle);
                    pipeline.Stage(Archive);
                    return pipeline.HandleReplies(handle, OnReply, OnGone).Finally(Done);
                }

            {{StageMethods}}

            {{CarryOnExchange}}
            }
            """
        );
        var original = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        var todos = result.Todos.Where(static todo => todo.Contains(".DefineExecute has", StringComparison.Ordinal));
        var migrated = await ReadMigrated(task);
        Assert.Collection(
            todos,
            between =>
                Assert.Contains(
                    "BetweenTask.DefineExecute has HandleReplies at line 14, not directly after its send at line 12, "
                        + "where one ExternalStage would change when the send goes out, so it was left as it is. Make it "
                        + "take a PipelineBuilder.ServiceTask",
                    between
                ),
            upfront =>
                Assert.Contains(
                    "HandleReplies at line 40, not directly after its send at line 38, where one ExternalStage would "
                        + "change when the send goes out; HandleReplies at line 41, not directly after its send at line 39",
                    upfront
                ),
            split => Assert.Contains("HandleReplies at line 67, not directly after its send at line 65", split)
        );
        // The compositions are left as they are; their steps keep their result types, reported as leftovers.
        Assert.Equal(Compositions(original), Compositions(migrated));
        Assert.Contains(
            result.Todos,
            todo => todo.Contains("StageExchangeResult was removed", StringComparison.Ordinal)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task CommentThatOneExternalStageHasNoPlaceFor_IsReported_NotDone(bool semantic)
    {
        var task = Write(
            "logic/CommentedTask.cs",
            $$"""
            public class CommentedTask : IServiceTask
            {
                public string Type => "commented";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle) // Sent.
                        .HandleReplies(handle, OnReply, OnGone)
                        .Finally(Done);

            {{StageMethods}}

            {{CarryOnExchange}}
            }
            """
        );
        var original = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Contains(
            result.Todos,
            todo =>
                todo.Contains(
                    "CommentedTask.DefineExecute has a comment or preprocessor directive at line 12 between the send "
                        + "at line 12 and its HandleReplies, which one ExternalStage has no place for",
                    StringComparison.Ordinal
                )
        );
        Assert.Equal(Compositions(original), Compositions(await ReadMigrated(task)));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task HandleThatGoesAnywhereElse_IsReported_NotDone(bool semantic)
    {
        var task = Write(
            "logic/HandleTasks.cs",
            $$"""
            public class HelperTask : IServiceTask
            {
                public string Type => "helper";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle);
                    Remember(handle);
                    return pipeline.HandleReplies(handle, OnReply, OnGone).Finally(Done);
                }

                private static void Remember(MailboxHandle handle) { }

            {{StageMethods}}

            {{CarryOnExchange}}
            }

            public class DiscardTask : IServiceTask
            {
                public string Type => "discard";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out _).Finally(Done);

            {{StageMethods}}

                private Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                    Task.FromResult(ServiceTaskOpeningStageResult.Completed());
            }

            public class LambdaTask : IServiceTask
            {
                public string Type => "lambda";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
                    pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle);
                    Func<MailboxHandle> later = () => handle;
                    return pipeline.HandleReplies(handle, OnReply, OnGone).Finally(Done);
                }

            {{StageMethods}}

            {{CarryOnExchange}}
            }
            """
        );

        var original = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Equal(Compositions(original), Compositions(await ReadMigrated(task)));
        var pipelines = result.Todos.Where(static todo =>
            todo.Contains(".DefineExecute has", StringComparison.Ordinal)
        );
        Assert.Collection(
            pipelines,
            helper => Assert.Contains("the MailboxHandle handle passed to Remember at line 13, so", helper),
            discard =>
                Assert.Contains(
                    "the send at line 39, whose MailboxHandle is discarded, so that nothing handles its replies",
                    discard
                ),
            lambda => Assert.Contains("the MailboxHandle handle used in a lambda at line 57", lambda)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ResultTypesAndFactories_OfEachKindOfStep_AreTheCurrentOnes_AndLifecycleStagesKeepTheirs(
        bool semantic
    )
    {
        var task = Write(
            "logic/ResultsTask.cs",
            """
            public class ResultsTask : IServiceTask
            {
                public string Type => "results";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Prepare)
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var first)
                        .HandleReplies(first, OnReceipt, OnGone)
                        .Stage(SendFinal, new MailboxOptions { Timeout = TimeSpan.FromDays(2) }, out var second)
                        .ConcludeOnReplies(second, OnVerdict, OnNoVerdict);

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Stage(Cleanup).Build();

                private async Task<StageResult> Prepare(StageContext context)
                {
                    await Task.Yield();
                    StageResult result = StageResult.Completed();
                    return result;
                }

                private Task<StageResult> Cleanup(StageContext context) => Task.FromResult(StageResult.Completed());

                private Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                    Task.FromResult(
                        mailbox.Id == Guid.Empty
                            ? ServiceTaskOpeningStageResult.Conclude(ServiceTaskResult.Success("reject"))
                            : ServiceTaskOpeningStageResult.Completed()
                    );

                private async Task<ServiceTaskOpeningStageResult> SendFinal(StageContext context, ServiceTaskMailbox mailbox)
                {
                    await Task.Yield();
                    return ServiceTaskOpeningStageResult.Conclude(ServiceTaskResult.FailedPermanent("Not sent."));
                }

                private Task<StageExchangeResult> OnReceipt(StageContext context, ServiceTaskReply reply) => Answer(reply);

                private static Task<StageExchangeResult> Answer(ServiceTaskReply reply) =>
                    reply.Payload == "ack"
                        ? Task.FromResult<StageExchangeResult>(StageExchangeResult.AwaitNextReply())
                        : Task.FromResult<StageExchangeResult>(StageResult.Completed());

                private Task<StageResult> OnGone(StageContext context, MailboxClosedReason reason) =>
                    Task.FromResult(StageResult.FailedPermanent("Gone."));

                private async Task<ServiceTaskExchangeResult> OnVerdict(StageContext context, ServiceTaskReply reply)
                {
                    await Task.Yield();
                    if (reply.Payload == "wait")
                        return ServiceTaskExchangeResult.AwaitNextReply();
                    return ServiceTaskResult.Success(reply.Payload);
                }

                private Task<ServiceTaskResult> OnNoVerdict(StageContext context, MailboxClosedReason reason) =>
                    Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "        pipeline\n"
                + "            .Stage(Prepare)\n"
                + "            .ExternalStage(Send, OnReceipt, timeout: TimeSpan.FromDays(1), onTimeout: OnGone)\n"
                + "            .ExternalStage(SendFinal, OnVerdict, timeout: TimeSpan.FromDays(2), onTimeout: OnNoVerdict);\n",
            migrated
        );
        Assert.Contains(
            "    private async Task<ServiceTaskResult> Prepare(StageContext context)\n"
                + "    {\n"
                + "        await Task.Yield();\n"
                + "        ServiceTaskResult result = ServiceTaskResult.Completed();\n",
            migrated
        );
        Assert.Contains(
            "    private Task<StageResult> Cleanup(StageContext context) => Task.FromResult(StageResult.Completed());\n",
            migrated
        );
        Assert.Contains(
            "    private Task<ServiceTaskResult> Send(StageContext context, ReplyAddress mailbox) =>\n"
                + "        Task.FromResult(\n"
                + "            mailbox.Id == Guid.Empty\n"
                + "                ? ServiceTaskResult.EndTask(\"reject\")\n"
                + "                : ServiceTaskResult.Completed()\n"
                + "        );\n",
            migrated
        );
        Assert.Contains("        return ServiceTaskResult.FailedPermanent(\"Not sent.\");\n", migrated);
        Assert.Contains(
            "    private Task<ServiceTaskReplyResult> OnReceipt(StageContext context, ServiceTaskReply reply) => "
                + "Answer(reply);\n"
                + "\n"
                + "    private static Task<ServiceTaskReplyResult> Answer(ServiceTaskReply reply) =>\n"
                + "        reply.Payload == \"ack\"\n"
                + "            ? Task.FromResult<ServiceTaskReplyResult>(ServiceTaskReplyResult.AwaitNextReply())\n"
                + "            : Task.FromResult<ServiceTaskReplyResult>(ServiceTaskReplyResult.Completed());\n",
            migrated
        );
        Assert.Contains(
            "    private Task<ServiceTaskResult> OnGone(StageContext context) =>\n"
                + "        Task.FromResult(ServiceTaskResult.FailedPermanent(\"Gone.\"));\n",
            migrated
        );
        Assert.Contains(
            "    private async Task<ServiceTaskReplyResult> OnVerdict(StageContext context, ServiceTaskReply reply)\n"
                + "    {\n"
                + "        await Task.Yield();\n"
                + "        if (reply.Payload == \"wait\")\n"
                + "            return ServiceTaskReplyResult.AwaitNextReply();\n"
                + "        return ServiceTaskResult.EndTask(reply.Payload);\n",
            migrated
        );
        Assert.Contains(
            "    private Task<ServiceTaskResult> OnNoVerdict(StageContext context) =>\n"
                + "        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.EndTask());\n",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task LambdaSteps_GetTheirKindsResultTypes(bool semantic)
    {
        var task = Write(
            "logic/LambdaStages.cs",
            """
            public class LambdaStagesTask : IServiceTask
            {
                public string Type => "lambdaStages";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(async Task<StageResult> (context) =>
                        {
                            await Task.Yield();
                            return StageResult.Completed();
                        })
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle)
                        .HandleReplies(
                            handle,
                            static (context, reply) => Task.FromResult<StageExchangeResult>(StageResult.Completed()),
                            static (context, reason) => Task.FromResult(StageResult.Completed())
                        )
                        .Finally(static context => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));

                public ProcessTaskPipeline DefineStart(PipelineBuilder pipeline) =>
                    pipeline.Stage(static context => Task.FromResult(StageResult.Completed())).Build();

                private static Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                    Task.FromResult(ServiceTaskOpeningStageResult.Completed());
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "            .Stage(async Task<ServiceTaskResult> (context) =>\n"
                + "            {\n"
                + "                await Task.Yield();\n"
                + "                return ServiceTaskResult.Completed();\n"
                + "            })\n"
                + "            .ExternalStage(\n"
                + "                Send,\n"
                + "                static (context, reply) => Task.FromResult<ServiceTaskReplyResult>(ServiceTaskReplyResult.Completed()),\n"
                + "                timeout: TimeSpan.FromDays(1),\n"
                + "                onTimeout: static context => Task.FromResult(ServiceTaskResult.Completed())\n"
                + "            )\n"
                + "            .Stage(static context => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.EndTask()));\n",
            migrated
        );
        Assert.Contains(
            "        pipeline.Stage(static context => Task.FromResult(StageResult.Completed()));\n",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task StepMethod_UsedElsewhereOrByALifecycleStage_IsReported_AndTheCompositionRewritten(bool semantic)
    {
        var task = Write(
            "logic/SharedStages.cs",
            $$"""
            public class LifecycleTooTask : IServiceTask
            {
                public string Type => "lifecycleToo";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Stage(Archive).Finally(Done);

                public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Stage(Archive).Build();

            {{StageMethods}}
            }

            public class CalledTask : IServiceTask
            {
                public string Type => "called";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Stage(Check).Finally(Done);

                public Task<StageResult> Check(StageContext context) => Task.FromResult(StageResult.Completed());

                public bool IsChecked(StageContext context) => Check(context).IsCompleted;

            {{StageMethods}}
            }

            public class FieldTask : IServiceTask
            {
                private readonly Func<StageContext, Task<StageResult>> _work = static context =>
                    Task.FromResult(StageResult.Completed());

                public string Type => "field";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Stage(_work).Finally(Done);

            {{StageMethods}}
            }
            """
        );

        var result = Migrate(semantic);

        var migrated = await ReadMigrated(task);
        Assert.Contains(
            "    public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => pipeline.Stage(Archive).Stage(Done);\n",
            migrated
        );
        Assert.Collection(
            result.Todos,
            lifecycle =>
                Assert.StartsWith(
                    Path.Combine("logic", "SharedStages.cs")
                        + ":14: LifecycleTooTask.Archive is a stage and is also "
                        + "used at "
                        + Path.Combine("logic", "SharedStages.cs")
                        + ":12, where the upgrade cannot follow "
                        + "it, so its result type and parameters were not rewritten. Give the stage a method of its own that returns "
                        + "Task<ServiceTaskResult>.",
                    lifecycle
                ),
            called => Assert.Contains("CalledTask.Check is a stage and is also used at", called),
            field =>
                Assert.StartsWith(
                    Path.Combine("logic", "SharedStages.cs")
                        + ":43: the stage passed here is not a lambda or a method "
                        + "the upgrade can find in the app, so it was not changed. A stage returns Task<ServiceTaskResult>.",
                    field
                )
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task RenamedTypesAndMembers_AreRenamedWhereverTheyStand(bool semantic)
    {
        var endpoint = Write(
            "logic/ReplyEndpoint.cs",
            """
            public sealed class ReplyEndpoint(IServiceTaskReplyForwarder forwarder)
            {
                public async Task<string> Forward(Guid id, string payload)
                {
                    try
                    {
                        await forwarder.ForwardReply(mailboxId: id, serviceTaskType: "archive", payload: payload, idempotencyKey: "key");
                        return "ok";
                    }
                    catch (ServiceTaskReplyForwardException ex) when (ex.Outcome == ServiceTaskReplyForwardOutcome.MailboxFull)
                    {
                        return $"full: {ex.MailboxId}";
                    }
                    catch (Exception ex) when (ex is ServiceTaskReplyForwardException { MailboxId: var mailbox })
                    {
                        return $"failed: {mailbox}";
                    }
                }

                public static Task<ServiceTaskResult> Publish(ServiceTaskMailbox mailbox) =>
                    Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("published"));

                public static bool Ended(ServiceTaskResult result) => result is SuccessfulServiceTaskResult { Action: null };

                public static bool Waits(object result) => result is StageAwaitNextReplyResult;
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        Assert.Equal(
            Path.Combine("logic", "ReplyEndpoint.cs")
                + ": ForwardReply's mailboxId is replyAddressId, ServiceTaskMailbox is ReplyAddress, "
                + "ServiceTaskReplyForwardException.MailboxId is ReplyAddressId, ServiceTaskReplyForwardOutcome.MailboxFull "
                + "is TooManyReplies, ServiceTaskResult.Success is EndTask, StageAwaitNextReplyResult is "
                + "ServiceTaskAwaitNextReplyResult, SuccessfulServiceTaskResult is EndedServiceTaskResult, as the current "
                + "API names them.",
            Assert.Single(Oks(result))
        );
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(endpoint);
        Assert.Contains("forwarder.ForwardReply(replyAddressId: id, serviceTaskType:", migrated);
        Assert.Contains("ServiceTaskReplyForwardOutcome.TooManyReplies)", migrated);
        Assert.Contains("return $\"full: {ex.ReplyAddressId}\";", migrated);
        Assert.Contains("ex is ServiceTaskReplyForwardException { ReplyAddressId: var mailbox }", migrated);
        Assert.Contains("public static Task<ServiceTaskResult> Publish(ReplyAddress mailbox) =>", migrated);
        Assert.Contains("ServiceTaskResult.EndTask(\"published\")", migrated);
        Assert.Contains("result is EndedServiceTaskResult { Action: null }", migrated);
        Assert.Contains("result is ServiceTaskAwaitNextReplyResult;", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ForwardReplyOfTheAppsOwn_KeepsItsMailboxIdArgument(bool semantic)
    {
        var relay = Write(
            "logic/Relay.cs",
            """
            public sealed class Relay
            {
                public Task Forward(Guid id) => ForwardReply(mailboxId: id, payload: "{}");

                private Task ForwardReply(Guid mailboxId, string payload) => Task.CompletedTask;
            }
            """
        );
        var original = await File.ReadAllTextAsync(relay, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        Assert.Empty(Oks(result));
        Assert.Equal(original, await File.ReadAllTextAsync(relay, TestContext.Current.CancellationToken));
        AssertCompilesAgainstCurrent();
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void MailboxIdOfTheAppsOwnType_BesideTheForwardException_IsNotReported(bool semantic)
    {
        Write(
            "logic/Relay.cs",
            """
            public sealed record StoredReply(Guid MailboxId, string Payload);

            public sealed class Relay(IServiceTaskReplyForwarder forwarder)
            {
                public async Task Forward(StoredReply stored)
                {
                    try
                    {
                        await forwarder.ForwardReply(stored.MailboxId, "archive", stored.Payload, "key");
                    }
                    catch (ServiceTaskReplyForwardException e) when (e.Outcome == ServiceTaskReplyForwardOutcome.Unroutable) { }
                }
            }
            """
        );

        var first = Migrate(semantic);
        var again = Migrate(semantic);

        Assert.Empty(first.Messages);
        Assert.Empty(again.Messages);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void SuccessHeldAsItsOwnType_IsReportedOrStillCompiles(bool semantic)
    {
        Write(
            "logic/HeldTask.cs",
            """
            public class HeldTask : IServiceTask
            {
                public string Type => "held";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Finally(Done);

                private Task<ServiceTaskResult> Done(StageContext context)
                {
                    var result = ServiceTaskResult.Success("reject");
                    Console.WriteLine($"Ending the task with {result.Action}.");
                    return Task.FromResult<ServiceTaskResult>(result);
                }
            }
            """
        );

        var result = Migrate(semantic);

        var errors = SemanticScannerFactory.CompileErrors(AppFolder, _currentSdk.Value);
        Assert.True(
            errors.Count == 0 || result.Todos.Count > 0,
            "Reported done without a to-do, but the migrated app does not compile:\n" + string.Join("\n", errors)
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task SuccessHeldAsItsOwnType_IsReportedAtItsLine_AndPassedOnAsTheBase_IsRenamed(bool semantic)
    {
        var task = Write(
            "logic/HeldTask.cs",
            """
            public class HeldTask : IServiceTask
            {
                public string Type => "held";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) => pipeline.Finally(Done);

                private Task<ServiceTaskResult> Done(StageContext context)
                {
                    var result = ServiceTaskResult.Success("reject");
                    Console.WriteLine(ServiceTaskResult.Success().Action);
                    return result.Action is null
                        ? Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("accept"))
                        : Task.FromResult<ServiceTaskResult>(result);
                }
            }
            """
        );

        var result = Migrate(semantic);

        var file = Path.Combine("logic", "HeldTask.cs");
        Assert.Equal(
            [
                $"{file}:14: ServiceTaskResult.Success returned the SuccessfulServiceTaskResult this code holds, so it "
                    + "was left as it is. ServiceTaskResult.EndTask returns a ServiceTaskResult: keep what you read from "
                    + "the result in a variable of its own, or match the result with is EndedServiceTaskResult.",
                $"{file}:15: ServiceTaskResult.Success returned the SuccessfulServiceTaskResult this code holds, so it "
                    + "was left as it is. ServiceTaskResult.EndTask returns a ServiceTaskResult: keep what you read from "
                    + "the result in a variable of its own, or match the result with is EndedServiceTaskResult.",
            ],
            result.Todos
        );
        var migrated = await ReadMigrated(task);
        Assert.Contains("var result = ServiceTaskResult.Success(\"reject\");", migrated);
        Assert.Contains("Console.WriteLine(ServiceTaskResult.Success().Action);", migrated);
        Assert.Contains("Task.FromResult<ServiceTaskResult>(ServiceTaskResult.EndTask(\"accept\"))", migrated);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task MailboxIdInAPropertyPattern_OnTheForwardException_IsRenamed(bool semantic)
    {
        var relay = Write(
            "logic/Relay.cs",
            """
            public sealed class Relay(IServiceTaskReplyForwarder forwarder)
            {
                public async Task<string> Forward(Guid id)
                {
                    try
                    {
                        await forwarder.ForwardReply(id, "archive", "{}", "key");
                        return "ok";
                    }
                    catch (ServiceTaskReplyForwardException e) when (e is { MailboxId: var failed } and { Outcome: ServiceTaskReplyForwardOutcome.Unroutable })
                    {
                        return $"unroutable: {failed}";
                    }
                    catch (ServiceTaskReplyForwardException e)
                    {
                        return e switch
                        {
                            { MailboxId: var full, Outcome: ServiceTaskReplyForwardOutcome.MailboxFull } => $"full: {full}",
                            _ => "failed",
                        };
                    }
                }
            }
            """
        );

        var result = Migrate(semantic);

        Assert.Empty(result.Todos);
        AssertCompilesAgainstCurrent();
        var migrated = await ReadMigrated(relay);
        Assert.Contains("when (e is { ReplyAddressId: var failed } and {", migrated);
        Assert.Contains(
            "{ ReplyAddressId: var full, Outcome: ServiceTaskReplyForwardOutcome.TooManyReplies } =>",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task ForwardExceptionAndForwarder_TheUpgradeCannotPlaceWithoutACompilation_AreReported(bool semantic)
    {
        var relay = Write(
            "logic/Relay.cs",
            """
            public static class Relay
            {
                public static IServiceTaskReplyForwarder Forwarder() => throw new NotImplementedException();

                public static ServiceTaskReplyForwardException Failure() => throw new NotImplementedException();

                public static Task Forward(Guid id) => Forwarder().ForwardReply(mailboxId: id, "archive", "{}", "key");

                public static Guid Failed() => Failure() is { MailboxId: var id } ? id : Failure().MailboxId;
            }
            """
        );

        var result = Migrate(semantic);

        if (semantic)
        {
            Assert.Empty(result.Todos);
            AssertCompilesAgainstCurrent();
            var migrated = await ReadMigrated(relay);
            Assert.Contains("Forwarder().ForwardReply(replyAddressId: id,", migrated);
            Assert.Contains("Failure() is { ReplyAddressId: var id } ? id : Failure().ReplyAddressId;", migrated);
            return;
        }

        var file = Path.Combine("logic", "Relay.cs");
        Assert.Empty(Oks(result));
        Assert.Equal(
            [
                $"{file}:12: if this calls IServiceTaskReplyForwarder.ForwardReply, its mailboxId: is replyAddressId: now.",
                $"{file}:14: if this reads ServiceTaskReplyForwardException.MailboxId, it is ReplyAddressId now.",
            ],
            result.Todos
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task StepMethod_ThatSharesItsSignature_IsReported_AndLeftAsItIs(bool semantic)
    {
        var task = Write(
            "logic/ArchiveTasks.cs",
            $$"""
            public interface IArchiveSteps
            {
                Task<StageResult> Archive(StageContext context);
            }

            public class ArchiveTask : IServiceTask, IArchiveSteps
            {
                public string Type => "archive";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Archive)
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle)
                        .ConcludeOnReplies(handle, OnAnswer, OnTimeout);

                public Task<StageResult> Archive(StageContext context) => Task.FromResult(StageResult.Completed());

                protected virtual Task<ServiceTaskResult> OnTimeout(StageContext context, MailboxClosedReason reason) =>
                    Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("No answer."));

                private Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                    Task.FromResult(ServiceTaskOpeningStageResult.Completed());

                private Task<ServiceTaskExchangeResult> OnAnswer(StageContext context, ServiceTaskReply reply) =>
                    Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());
            }

            public class PatientArchiveTask : ArchiveTask
            {
                protected override Task<ServiceTaskResult> OnTimeout(StageContext context, MailboxClosedReason reason) =>
                    Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Defer(TimeSpan.FromDays(1)));
            }
            """
        );

        var result = Migrate(semantic);

        var file = Path.Combine("logic", "ArchiveTasks.cs");
        Assert.Contains(
            $"{file}:20: ArchiveTask.Archive shares its signature with IArchiveSteps, which its type implements, so "
                + "its result type and parameters were not rewritten. Make it, and each method that shares its "
                + "signature, a method that returns Task<ServiceTaskResult>.",
            result.Todos
        );
        Assert.Contains(
            result.Todos,
            todo =>
                todo.StartsWith(
                    $"{file}:22: ArchiveTask.OnTimeout shares its signature with its override at {file}:34, so",
                    StringComparison.Ordinal
                )
        );
        var migrated = await ReadMigrated(task);
        Assert.Contains("public Task<StageResult> Archive(StageContext context) =>", migrated);
        Assert.Contains(
            "protected virtual Task<ServiceTaskResult> OnTimeout(StageContext context, MailboxClosedReason reason) =>",
            migrated
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void PreviewApiLeftAnywhere_IsReportedWithItsFileAndLine(bool semantic)
    {
        Write(
            "logic/Mailboxes.cs",
            """
            public static class Mailboxes
            {
                public static readonly MailboxOptions Long = new() { Timeout = TimeSpan.FromDays(7) };

                public static Task<StageExchangeResult> Ignore(ServiceTaskReply reply) =>
                    Task.FromResult<StageExchangeResult>(StageExchangeResult.AwaitNextReply());

                public static string Describe(MailboxClosedReason reason) => reason.ToString();

                public static bool Opened(object result) => result is ServiceTaskOpeningStageResult;
            #if DEBUG
                public static ServiceTaskPipeline? Last;
            #endif
            }
            """
        );

        var result = Migrate(semantic);

        var file = Path.Combine("logic", "Mailboxes.cs");
        Assert.Empty(Oks(result));
        Assert.Equal(
            [
                $"{file}:8: MailboxOptions was removed. Give ExternalStage the timeout as timeout:.",
                $"{file}:10: StageExchangeResult was removed. A reply handler returns ServiceTaskReplyResult.",
                $"{file}:11: StageExchangeResult was removed. A reply handler returns ServiceTaskReplyResult.",
                $"{file}:13: MailboxClosedReason was removed. onTimeout takes only the StageContext, and runs when the "
                    + "timeout passes.",
                $"{file}:15: ServiceTaskOpeningStageResult was removed. A send returns ServiceTaskResult, and returns "
                    + "the result itself where it returned Conclude(result).",
                $"{file}:17: ServiceTaskPipeline was removed. DefineExecute returns nothing, and a method that composes "
                    + "part of it returns PipelineBuilder.ServiceTask.",
            ],
            result.Todos
        );
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task RenamedApiInDisabledCode_IsReported_AndTheMethodItIsInLeftAsItIs(bool semantic)
    {
        var task = Write(
            "logic/DisabledTask.cs",
            """
            public class DisabledTask : IServiceTask
            {
                public string Type => "disabled";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
                {
            #if NEVER
                    Console.WriteLine(ServiceTaskResult.Success());
            #endif
                    return pipeline.Finally(Done);
                }

                private Task<ServiceTaskResult> Done(StageContext context) =>
                    Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent("No."));
            #if NEVER
                private static Task<ServiceTaskResult> Publish(ServiceTaskMailbox mailbox) =>
                    Task.FromResult<ServiceTaskResult>(ServiceTaskResult . Success());
            #endif
            }
            """
        );
        var original = await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken);

        var result = Migrate(semantic);

        var file = Path.Combine("logic", "DisabledTask.cs");
        Assert.Empty(Oks(result));
        Assert.Equal(original, await File.ReadAllTextAsync(task, TestContext.Current.CancellationToken));
        Assert.Equal(
            [
                $"{file}:10: DisabledTask.DefineExecute has code disabled by a preprocessor directive at line 13 that "
                    + "names the previews' pipeline API, so it was left as it is. Make it take a "
                    + "PipelineBuilder.ServiceTask and compose a stage with Stage and a send with its reply handler with "
                    + "ExternalStage, as in public void DefineExecute(PipelineBuilder.ServiceTask pipeline) => "
                    + "pipeline.ExternalStage(Send, OnReply, timeout: TimeSpan.FromDays(7), onTimeout: OnTimeout)"
                    + ".Stage(Archive);",
                $"{file}:21: ServiceTaskMailbox is ReplyAddress now. Rename it in this code, which a preprocessor "
                    + "directive disables.",
                $"{file}:22: ServiceTaskResult.Success is EndTask now. Rename it in this code, which a preprocessor "
                    + "directive disables.",
            ],
            result.Todos
        );
    }

    [Fact]
    public async Task RunningAgain_AfterReportedSteps_ChangesNothing_AndReportsNothingNew()
    {
        var task = Write(
            "logic/ReportedSteps.cs",
            $$"""
            public class ReasonTask : IServiceTask
            {
                public string Type => "reason";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var handle).ConcludeOnReplies(handle, OnAnswer, OnClosed);

                private Task<ServiceTaskResult> OnClosed(StageContext context, MailboxClosedReason reason) =>
                    Task.FromResult<ServiceTaskResult>(ServiceTaskResult.FailedPermanent($"Closed: {reason}."));

                private Task<ServiceTaskOpeningStageResult> Send(StageContext context, ServiceTaskMailbox mailbox) =>
                    Task.FromResult(ServiceTaskOpeningStageResult.Completed());

                private Task<ServiceTaskExchangeResult> OnAnswer(StageContext context, ServiceTaskReply reply) =>
                    OnAnswerToo(context, reply);

                private Task<ServiceTaskExchangeResult> OnAnswerToo(StageContext context, ServiceTaskReply reply) =>
                    Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

                public Task<ServiceTaskExchangeResult> Answer(ServiceTaskReply reply) => OnAnswerToo(new StageContext(), reply);
            }

            public class UpfrontTask : IServiceTask
            {
                public string Type => "upfront";

                public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline) =>
                    pipeline
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var alpha)
                        .Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out var beta)
                        .HandleReplies(alpha, OnReply, OnGone)
                        .HandleReplies(beta, OnReply, OnGone)
                        .Finally(Done);

            {{StageMethods}}

            {{CarryOnExchange}}
            }
            """
        );
        var first = Migrate(semantic: false);
        var once = await ReadMigrated(task);
        Assert.Contains(
            first.Todos,
            todo => todo.Contains("ReasonTask.OnClosed uses its MailboxClosedReason", StringComparison.Ordinal)
        );
        Assert.Contains(
            first.Todos,
            todo =>
                todo.Contains("ReasonTask.OnAnswerToo is a reply handler and is also used at", StringComparison.Ordinal)
        );

        var again = Migrate(semantic: false);

        Assert.Empty(Oks(again));
        Assert.Equal(once, await ReadMigrated(task));
        Assert.All(again.Todos, todo => Assert.Contains(todo, first.Todos));
        Assert.NotEmpty(again.Todos);
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
                        PipelineBuilder builder = pipeline.Stage(Archive);
                        builder.Stage(Send, new MailboxOptions { Timeout = TimeSpan.FromDays(1) }, out MailboxHandle reply);
                        return builder.ConcludeOnReplies(reply, OnAnswer, OnTimeout);
                    }

                    public ProcessTaskPipeline DefineEnd(PipelineBuilder pipeline) => pipeline.Stage(Revoke).Build();

                    public ProcessTaskPipeline DefineAbandon(PipelineBuilder pipeline) => pipeline.Build();

                    private Task<StageResult> Revoke(StageContext context) => Task.FromResult(StageResult.Completed());

                {{StageMethods}}

                {{ConcludingExchange}}
                }

                public sealed class ReplyEndpoint(IServiceTaskReplyForwarder forwarder)
                {
                    public Task Forward(Guid id) => forwarder.ForwardReply(mailboxId: id, "mailbox", "{}", "key");
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
        var first = Migrate(semantic: false);
        Assert.Empty(first.Todos);
        Assert.NotEmpty(Oks(first));
        var once = await Task.WhenAll(files.Select(ReadMigrated));
        Assert.Contains(
            "        PipelineBuilder.ServiceTask builder = pipeline.Stage(Archive);\n"
                + "        builder.ExternalStage(Send, OnAnswer, timeout: TimeSpan.FromDays(1), onTimeout: OnTimeout);\n"
                + "    }\n",
            once[0]
        );

        var again = Migrate(semantic: false);

        Assert.Empty(again.Messages);
        Assert.Equal(once, await Task.WhenAll(files.Select(ReadMigrated)));

        // With a semantic model of the migrated app, without the stub, which stops the build.
        File.Delete(files[1]);
        AssertCompilesAgainstCurrent();
        Assert.Empty(Migrate(semantic: true, _currentSdk.Value).Messages);
        Assert.Equal(once[0], await ReadMigrated(files[0]));
    }
}
