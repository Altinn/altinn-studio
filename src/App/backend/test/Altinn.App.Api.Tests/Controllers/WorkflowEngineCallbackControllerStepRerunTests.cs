using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.App.Api.Controllers;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Mocks;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Testing;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

/// <summary>
/// Steps of a service task through the real callback: which of them save a result, and one step run more than once,
/// with a handler that decides differently on another run. Every run must go on from the result Storage committed
/// first: one continuation in the engine, started on the data Storage has. Each run records its number in the
/// instance's data values, so Storage and every published state show which run's data they hold.
/// </summary>
public class WorkflowEngineCallbackControllerStepRerunTests : ApiTestBase
{
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int InstanceOwnerPartyId = 500600;
    private const string ServiceTaskType = "step-rerun-probe";
    private const string RunKey = "run";
    private const string FileDataType = "specificFileType";
    private const string FileContentType = "application/json";

    private const int SendIndex = 0;
    private const int MiddleIndex = 1;
    private const int HandlerIndex = 3;
    private const int FinalIndex = 0;
    private const int SegmentHandlerIndex = 1;
    private const int SegmentConclusionIndex = 2;

    private static readonly Guid _mailboxId = new("018f4e00-0000-7000-8000-0000000000aa");

    private readonly Guid _instanceGuid = Guid.NewGuid();
    private readonly Guid _workflowId = Guid.NewGuid();
    private readonly Guid _stepId = Guid.NewGuid();
    private readonly RecordingEngine _engine = new();
    private HttpClient? _client;
    private string? _incomingState;

    public WorkflowEngineCallbackControllerStepRerunTests(ITestOutputHelper outputHelper)
        : base(outputHelper) { }

    public override async Task DisposeAsync()
    {
        _client?.Dispose();
        TestData.DeleteInstanceAndData(Org, App, InstanceOwnerPartyId, _instanceGuid);
        await base.DisposeAsync();
    }

    [Fact]
    public async Task LostAnswer_WaitThenConclude_TheSecondRunWaitsToo()
    {
        var task = new ScriptedTask();
        task.Replies("1", ServiceTaskExchangeResult.AwaitNextReply());
        task.Replies("2", ServiceTaskResult.Success("confirm"));
        await Start(task);

        RunOutcome first = await RunStep(HandlerIndex);
        RunOutcome second = await RunStep(HandlerIndex);

        await AssertAgreement(storedRun: "1", Receiver(), mailboxClosed: false, first, second);
    }

    [Fact]
    public async Task LostAnswer_ConcludeThenWait_TheSecondRunConcludesToo()
    {
        var task = new ScriptedTask();
        // The first run changes no data, so its save carries the result alone.
        task.Replies(run: null, ServiceTaskResult.Success("confirm"));
        task.Replies("2", ServiceTaskExchangeResult.AwaitNextReply());
        await Start(task);

        RunOutcome first = await RunStep(HandlerIndex);
        RunOutcome second = await RunStep(HandlerIndex);

        await AssertAgreement(storedRun: null, AfterWorkflow("confirm"), mailboxClosed: true, first, second);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task LostAnswer_OpeningStage_TheSecondRunGoesOnAsTheFirstDid(bool concludeFirst)
    {
        var task = new ScriptedTask();
        Func<StageContext, Task<ServiceTaskOpeningStageResult>> completes = Decides(
            concludeFirst ? "2" : "1",
            ServiceTaskOpeningStageResult.Completed()
        );
        Func<StageContext, Task<ServiceTaskOpeningStageResult>> concludes = Decides(
            concludeFirst ? "1" : "2",
            ServiceTaskOpeningStageResult.Conclude(ServiceTaskResult.Success("reject"))
        );
        task.Send.Enqueue(concludeFirst ? concludes : completes);
        task.Send.Enqueue(concludeFirst ? completes : concludes);
        await Start(task);

        RunOutcome first = await RunStep(SendIndex, delivered: false);
        RunOutcome second = await RunStep(SendIndex, delivered: false);

        await AssertAgreement(
            storedRun: "1",
            concludeFirst ? AfterWorkflow("reject") : Continuation(MiddleIndex, MiddleIndex + 1),
            mailboxClosed: concludeFirst,
            first,
            second
        );
    }

    [Fact]
    public async Task LostAnswer_StageInTheMiddleOfAPipeline_TheSecondRunKeepsTheFirstRunsData()
    {
        var task = new ScriptedTask();
        task.Stages("1", StageResult.Completed());
        task.Stages("2", StageResult.Completed());
        await Start(task);

        RunOutcome first = await RunStep(MiddleIndex, delivered: false);
        RunOutcome second = await RunStep(MiddleIndex, delivered: false);

        await AssertAgreement(storedRun: "1", expectedEntry: null, mailboxClosed: false, first, second);
    }

    [Fact]
    public async Task LostAnswer_StageWhoseSecondRunWritesNothing_GoesOnWithTheFirstRunsDataAndTheNextStepSaves()
    {
        var task = new ScriptedTask();
        task.Stages("1", StageResult.Completed());
        task.Stages(run: null, StageResult.Completed());
        task.Stages("next", StageResult.Completed());
        await Start(task);

        RunOutcome first = await RunStep(MiddleIndex, delivered: false);
        RunOutcome second = await RunStep(MiddleIndex, delivered: false);
        _incomingState = Services
            .GetRequiredService<WorkflowStateSigner>()
            .Sign(JsonSerializer.Serialize(second.Returned), SigningDomain.CallbackState);
        RunOutcome next = await RunStep(MiddleIndex, delivered: false, stepId: Guid.NewGuid());

        await AssertAgreement(storedRun: "next", expectedEntry: null, mailboxClosed: false, next);
        Assert.All([first, second], run => Assert.Equal("1", run.Returned!.Instance.DataValues?[RunKey]));
    }

    [Fact]
    public async Task LostAnswer_SegmentHandlerThatWaitsThenCompletes_TheSecondRunWaitsToo()
    {
        var task = new ScriptedTask(Shape.Segment);
        task.SegmentReplies("1", StageExchangeResult.AwaitNextReply());
        task.SegmentReplies("2", StageResult.Completed());
        await Start(task);

        RunOutcome first = await RunStep(SegmentHandlerIndex);
        RunOutcome second = await RunStep(SegmentHandlerIndex);

        await AssertAgreement(storedRun: "1", Receiver(SegmentHandlerIndex), mailboxClosed: false, first, second);
    }

    [Fact]
    public async Task LostAnswer_StageThatReplacedAFile_TheSecondRunReadsWhatTheFirstRead()
    {
        var task = new ScriptedTask();
        var read = new List<string>();
        task.Middle.Enqueue(ReplacesTheFile("1", "v2"));
        task.Middle.Enqueue(ReplacesTheFile("2", "v3"));
        await Start(task, file: "v1"u8.ToArray());

        RunOutcome first = await RunStep(MiddleIndex, delivered: false);
        RunOutcome second = await RunStep(MiddleIndex, delivered: false);

        Assert.Equal(["v1", "v1"], read);
        await AssertAgreement(storedRun: "1", expectedEntry: null, mailboxClosed: false, first, second);
        DataElement stored = Assert.Single((await ReadStoredInstance()).Data);
        Assert.Equal("v2"u8.ToArray(), await ReadStoredFile(stored));
        string? storedVersion = Services
            .GetRequiredService<ApiTestStorageMetadata>()
            .GetDataElementBlobVersionId(
                new InstanceIdentifier(InstanceOwnerPartyId, _instanceGuid),
                Guid.Parse(stored.Id)
            );
        Assert.All(
            [first, second],
            run => Assert.Equal(storedVersion, Assert.Single(run.Returned!.Instance.Data).BlobVersionId)
        );

        Func<StageContext, Task<StageResult>> ReplacesTheFile(string run, string content) =>
            async context =>
            {
                DataElement file = Assert.Single(context.InstanceDataMutator.Instance.Data);
                read.Add(Encoding.UTF8.GetString((await context.InstanceDataMutator.GetBinaryData(file)).Span));
                context.InstanceDataMutator.UpdateBinaryDataElement(
                    file,
                    FileContentType,
                    Encoding.UTF8.GetBytes(content)
                );
                return await Decides(run, StageResult.Completed())(context);
            };
    }

    [Fact]
    public async Task EnqueueFailedAfterTheSave_TheSecondRunEnqueuesWhatTheFirstDecided()
    {
        var task = new ScriptedTask();
        task.Replies("1", ServiceTaskExchangeResult.AwaitNextReply());
        task.Replies("2", ServiceTaskResult.Success("confirm"));
        await Start(task);
        _engine.FailNextEnqueue = true;

        // The test server hands the relay's exception to the client, where real hosting answers the engine a 500.
        await Assert.ThrowsAsync<HttpRequestException>(() => RunStep(HandlerIndex));
        Assert.Empty(_engine.Entries);
        RunOutcome second = await RunStep(HandlerIndex);

        await AssertAgreement(storedRun: "1", Receiver(), mailboxClosed: false, second);
    }

    /// <summary>
    /// Both runs are in their handlers before either saves, as when the engine runs a step again while the first run
    /// still holds the app, and their saves reach Storage together. Storage's lock on the instance lets one of them
    /// commit and makes the other a replay.
    /// </summary>
    [Fact]
    public async Task OverlappingRuns_WhoseSavesRace_BothGoOnFromTheRunThatCommitted()
    {
        var task = new ScriptedTask();
        task.Replies("A", ServiceTaskExchangeResult.AwaitNextReply());
        task.Replies("B", ServiceTaskResult.Success("confirm"));
        await Start(task);
        Services.GetRequiredService<ApiTestStorageMetadata>().GatherMutations(2);

        RunOutcome[] outcomes = await Task.WhenAll(RunStep(HandlerIndex), RunStep(HandlerIndex))
            .WaitAsync(TimeSpan.FromSeconds(20));

        bool waitCommitted = (await ReadStoredInstance()).DataValues?.GetValueOrDefault(RunKey) == "A";
        await AssertAgreement(
            storedRun: waitCommitted ? "A" : "B",
            waitCommitted ? Receiver() : AfterWorkflow("confirm"),
            mailboxClosed: !waitCommitted,
            outcomes
        );
    }

    [Fact]
    public async Task ReplayWithoutAStoredResult_FailsTheStepPermanentlyAndStartsNothing()
    {
        var task = new ScriptedTask();
        task.Replies("2", ServiceTaskResult.Success("confirm"));
        await Start(task);
        await CommitAsAnotherRun(callerResult: null);

        RunOutcome run = await RunStep(HandlerIndex);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, run.Status);
        Assert.Equal("ServiceTaskCommittedResultMissing", ProblemTitle(run));
        Assert.Empty(_engine.Entries);
        Assert.Empty(_engine.Closed);
        Assert.Equal("other", (await ReadStoredInstance()).DataValues?.GetValueOrDefault(RunKey));
    }

    [Theory]
    [InlineData("""{"kind":"release"}""")]
    [InlineData("""{"kind":"success","action":"confirm","release":true}""")]
    public async Task ReplayWithACommittedResultThisVersionCannotRead_FailsTheStepRetryablyAndStartsNothing(
        string committedResult
    )
    {
        var task = new ScriptedTask();
        task.Replies("2", ServiceTaskResult.Success("confirm"));
        await Start(task);
        await CommitAsAnotherRun(committedResult);

        RunOutcome run = await RunStep(HandlerIndex);

        Assert.Equal(HttpStatusCode.InternalServerError, run.Status);
        Assert.Equal("ServiceTaskCommittedResultUnreadable", ProblemTitle(run));
        Assert.Empty(_engine.Entries);
        Assert.Empty(_engine.Closed);
        Assert.Equal("other", (await ReadStoredInstance()).DataValues?.GetValueOrDefault(RunKey));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task PermanentFailure_SendsNoSaveAndClosesTheExchange_AlsoWithoutAStepId(bool withStepId)
    {
        var task = new ScriptedTask();
        task.Replies("1", ServiceTaskResult.FailedPermanent("the archive refused the message"));
        await Start(task);

        RunOutcome run = await RunStep(HandlerIndex, stepId: withStepId ? _stepId : Guid.Empty);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, run.Status);
        Assert.Equal(0, Services.GetRequiredService<ApiTestStorageMetadata>().AggregateMutationRequestCount);
        Assert.Empty(_engine.Entries);
        Assert.Contains(_mailboxId, _engine.Closed);
    }

    [Fact]
    public async Task ResumeAfterAPermanentFailure_WithNothingCommitted_DecidesAnew()
    {
        var task = new ScriptedTask(Shape.Final);
        task.Concludes("1", ServiceTaskResult.FailedPermanent("the archive is misconfigured"));
        task.Concludes("2", ServiceTaskResult.Success("confirm"));
        await Start(task);

        RunOutcome failed = await RunStep(FinalIndex, delivered: false);
        RunOutcome resumed = await RunStep(FinalIndex, delivered: false);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, failed.Status);
        await AssertAgreement(storedRun: "2", AfterConclusion("confirm"), mailboxClosed: false, resumed);
    }

    /// <summary>
    /// Such a Storage commits a save that changed data without the result, and refuses one of the result alone with
    /// 400. Either way only Storage is to blame, and a retry would run the handler again for nothing.
    /// </summary>
    [Theory]
    [InlineData("1")]
    [InlineData(null)]
    public async Task StorageThatKeepsNoResult_FailsTheStepPermanentlyAtItsFirstSaveAndStartsNothing(string? run)
    {
        var task = new ScriptedTask();
        task.Replies(run, ServiceTaskResult.Success("confirm"));
        await Start(task);
        Services.GetRequiredService<ApiTestStorageMetadata>().KeepsCallerResults = false;

        RunOutcome outcome = await RunStep(HandlerIndex);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, outcome.Status);
        Assert.Equal("ServiceTaskCommittedResultMissing", ProblemTitle(outcome));
        Assert.Contains("A Storage that does not keep a mutation's callerResult", ProblemDetail(outcome));
        Assert.DoesNotContain("earlier version of the app", ProblemDetail(outcome));
        Assert.Empty(_engine.Entries);
        Assert.Empty(_engine.Closed);
    }

    [Fact]
    public async Task PermanentFailureAfterALostAnswer_FailsTheStep_AndAResumeAdoptsTheCommittedResult()
    {
        var task = new ScriptedTask(Shape.Final);
        task.Concludes("1", ServiceTaskResult.Success("confirm"));
        task.Concludes("2", ServiceTaskResult.FailedPermanent("the archive is unreachable for good"));
        task.Concludes("3", ServiceTaskResult.Success("reject"));
        await Start(task);

        RunOutcome first = await RunStep(FinalIndex, delivered: false);
        RunOutcome failed = await RunStep(FinalIndex, delivered: false);
        IReadOnlyList<EngineEntry> afterFailure = [.. _engine.Entries];
        RunOutcome resumed = await RunStep(FinalIndex, delivered: false);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, failed.Status);
        Assert.Equal(AfterConclusion("confirm"), Assert.Single(afterFailure) with { State = "" });
        await AssertAgreement(storedRun: "1", AfterConclusion("confirm"), mailboxClosed: false, first, resumed);
    }

    public static TheoryData<string, string> StepsAndTheResultTheySave =>
        new()
        {
            { "plain stage", """{"kind":"completed"}""" },
            { "plain stage that changes data", """{"kind":"completed"}""" },
            { "plain stage that ends its workflow", """{"kind":"completed"}""" },
            { "mailbox-opening stage", """{"kind":"completed"}""" },
            { "reply handler", """{"kind":"success","action":"confirm"}""" },
            { "reply handler that changes data", """{"kind":"success","action":"confirm"}""" },
            { "segment handler that waits", """{"kind":"awaitNextReply"}""" },
            { "segment handler that completes", """{"kind":"completed"}""" },
            { "segment closed handler", """{"kind":"completed"}""" },
            { "conclusion", """{"kind":"success","action":"confirm"}""" },
        };

    [Theory]
    [MemberData(nameof(StepsAndTheResultTheySave))]
    public async Task EveryStepOfAServiceTaskThatCompletes_SavesAndSendsItsResult(string item, string expectedResult)
    {
        RunOutcome outcome = item switch
        {
            "plain stage" => await RunScripted(task => task.Stages(null, StageResult.Completed()), MiddleIndex),
            "plain stage that changes data" => await RunScripted(
                task => task.Stages("1", StageResult.Completed()),
                MiddleIndex
            ),
            "plain stage that ends its workflow" => await RunScripted(_ => { }, HandlerIndex - 1),
            "mailbox-opening stage" => await RunScripted(
                task => task.Send.Enqueue(Decides(null, ServiceTaskOpeningStageResult.Completed())),
                SendIndex
            ),
            "reply handler" => await RunScripted(
                task => task.Replies(null, ServiceTaskResult.Success("confirm")),
                HandlerIndex,
                delivered: true
            ),
            "reply handler that changes data" => await RunScripted(
                task => task.Replies("1", ServiceTaskResult.Success("confirm")),
                HandlerIndex,
                delivered: true
            ),
            "segment handler that waits" => await RunScripted(
                task => task.SegmentReplies(null, StageExchangeResult.AwaitNextReply()),
                SegmentHandlerIndex,
                delivered: true,
                shape: Shape.Segment
            ),
            "segment handler that completes" => await RunScripted(
                task => task.SegmentReplies(null, StageResult.Completed()),
                SegmentHandlerIndex,
                delivered: true,
                shape: Shape.Segment
            ),
            "segment closed handler" => await RunScripted(
                task => task.SegmentClosed.Enqueue(Decides(null, StageResult.Completed())),
                SegmentHandlerIndex,
                closed: true,
                shape: Shape.Segment
            ),
            "conclusion" => await RunScripted(
                task => task.Concludes(null, ServiceTaskResult.Success("confirm")),
                SegmentConclusionIndex,
                shape: Shape.Segment
            ),
            _ => throw new ArgumentOutOfRangeException(nameof(item), item, null),
        };

        Assert.Equal(HttpStatusCode.OK, outcome.Status);
        Assert.Equal([expectedResult], Services.GetRequiredService<ApiTestStorageMetadata>().SentCallerResults);

        async Task<RunOutcome> RunScripted(
            Action<ScriptedTask> script,
            int itemIndex,
            bool delivered = false,
            bool closed = false,
            Shape shape = Shape.Exchange
        )
        {
            var task = new ScriptedTask(shape);
            script(task);
            await Start(task);
            return await RunStep(itemIndex, delivered, closed: closed);
        }
    }

    [Theory]
    [InlineData(MiddleIndex, false)]
    [InlineData(HandlerIndex - 1, false)]
    [InlineData(HandlerIndex, true)]
    public async Task StepWithoutAStepId_FailsBeforeItSavesAndStartsNothing(int itemIndex, bool delivered)
    {
        var task = new ScriptedTask();
        task.Stages("1", StageResult.Completed());
        task.Replies("1", ServiceTaskResult.Success("confirm"));
        await Start(task);

        RunOutcome run = await RunStep(itemIndex, delivered, stepId: Guid.Empty);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, run.Status);
        Assert.Equal("StepIdMissing", ProblemTitle(run));
        Assert.Equal(0, Services.GetRequiredService<ApiTestStorageMetadata>().AggregateMutationRequestCount);
        Assert.Empty(_engine.Entries);
        Assert.Empty(_engine.Closed);
    }

    [Theory]
    [InlineData("reject", true)]
    [InlineData("confirm", false)]
    public async Task LostAnswer_ASecondRunThatDecidedOtherwise_LogsBothResults(string secondAction, bool logged)
    {
        var task = new ScriptedTask(Shape.Final);
        task.Concludes("1", ServiceTaskResult.Success("confirm"));
        task.Concludes("2", ServiceTaskResult.Success(secondAction));
        await Start(task);

        await RunStep(FinalIndex, delivered: false);
        await RunStep(FinalIndex, delivered: false);

        IEnumerable<string> lines = Services
            .GetRequiredService<FakeLogCollector>()
            .GetSnapshot()
            .Where(record =>
                record.Level == LogLevel.Information
                && record.Message.Contains("which another run committed first", StringComparison.Ordinal)
            )
            .Select(record => record.Message);
        if (logged)
        {
            string line = Assert.Single(lines);
            Assert.Contains("""{"kind":"success","action":"reject"}""", line, StringComparison.Ordinal);
            Assert.Contains("""{"kind":"success","action":"confirm"}""", line, StringComparison.Ordinal);
        }
        else
        {
            Assert.Empty(lines);
        }
    }

    [Fact]
    public async Task RunAfterTheInstanceMovedOn_FailsAsStaleAndStartsNothing()
    {
        var task = new ScriptedTask();
        task.Replies("1", ServiceTaskExchangeResult.AwaitNextReply());
        task.Replies("2", ServiceTaskResult.Success("confirm"));
        await Start(task);
        RunOutcome first = await RunStep(HandlerIndex);
        await CommitAsTheNextStep(first.Returned!);
        IReadOnlyList<EngineEntry> beforeTheLateRun = _engine.Entries;

        RunOutcome late = await RunStep(HandlerIndex);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, late.Status);
        Assert.Equal("StoragePreconditionFailedException", ProblemTitle(late));
        Assert.Equal(beforeTheLateRun, _engine.Entries);
        Assert.Empty(_engine.Closed);
        Assert.Equal("next", (await ReadStoredInstance()).DataValues?.GetValueOrDefault(RunKey));
    }

    [Fact]
    public async Task HandlerThatAbandonsItsChanges_FailsTheStepBeforeAnythingIsSaved()
    {
        var task = new ScriptedTask();
        task.Reply.Enqueue(context =>
        {
            context.InstanceDataMutator.AbandonAllChanges([
                new ValidationIssue { Severity = ValidationIssueSeverity.Error, Description = "abandoned" },
            ]);
            return Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success("confirm"));
        });
        await Start(task);

        RunOutcome run = await RunStep(HandlerIndex);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, run.Status);
        Assert.Equal("Data Abandonment", ProblemTitle(run));
        Assert.Equal(0, Services.GetRequiredService<ApiTestStorageMetadata>().AggregateMutationRequestCount);
        Assert.Empty(_engine.Entries);
        Assert.Empty(_engine.Closed);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task StepThatWritesThroughAnotherTokensOverride_FailsPermanentlyNamingTheOverride(bool plainStage)
    {
        var task = new ScriptedTask(plainStage ? Shape.Exchange : Shape.Final);
        task.Middle.Enqueue(context =>
        {
            WriteTheFileThroughACustomToken(context);
            return Task.FromResult(StageResult.Completed());
        });
        task.Final.Enqueue(context =>
        {
            WriteTheFileThroughACustomToken(context);
            return Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success("confirm"));
        });
        await Start(task, file: "v1"u8.ToArray());

        RunOutcome run = await RunStep(plainStage ? MiddleIndex : FinalIndex, delivered: false);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, run.Status);
        Assert.Equal(nameof(InstanceMutationCallerResultForbiddenException), ProblemTitle(run));
        Assert.Contains(nameof(IInstanceDataAccessor.OverrideAuthenticationMethod), run.Body, StringComparison.Ordinal);
        Assert.Empty(_engine.Entries);
        string denial = ServiceOwnerAuthorizationDiagnostics.Describe(
            Services.GetRequiredService<IAppMetadata>().ApplicationMetadata
        );
        Assert.DoesNotContain(
            Services.GetRequiredService<FakeLogCollector>().GetSnapshot(),
            record => record.Message.Contains(denial, StringComparison.Ordinal)
        );
    }

    private static void WriteTheFileThroughACustomToken(StageContext context)
    {
        DataElement file = Assert.Single(context.InstanceDataMutator.Instance.Data);
        context.InstanceDataMutator.OverrideAuthenticationMethod(
            context.InstanceDataMutator.GetDataType(file),
            StorageAuthenticationMethod.Custom(() =>
                throw new NotSupportedException("The fake Storage takes no token.")
            )
        );
        context.InstanceDataMutator.UpdateBinaryDataElement(file, FileContentType, "v2"u8.ToArray());
    }

    private enum Shape
    {
        Exchange,
        Final,
        Segment,
    }

    /// <summary>
    /// The pipeline of <see cref="Shape.Exchange"/>: a stage that opens the mailbox, a stage that completes inside its
    /// workflow, a stage that starts the receive workflow, and the reply handler that concludes the task. Of
    /// <see cref="Shape.Final"/>: only the conclusion. Of <see cref="Shape.Segment"/>: a stage that opens the mailbox,
    /// a reply handler the pipeline carries on past, and the conclusion. Each run of an item takes the next of its
    /// scripted decisions.
    /// </summary>
    private sealed class ScriptedTask(Shape shape = Shape.Exchange) : IServiceTask
    {
        public string Type => ServiceTaskType;

        public Queue<Func<StageContext, Task<ServiceTaskOpeningStageResult>>> Send { get; } = new();

        public Queue<Func<StageContext, Task<StageResult>>> Middle { get; } = new();

        public Queue<Func<StageContext, Task<ServiceTaskExchangeResult>>> Reply { get; } = new();

        public Queue<Func<StageContext, Task<ServiceTaskResult>>> Final { get; } = new();

        public Queue<Func<StageContext, Task<StageExchangeResult>>> SegmentReply { get; } = new();

        public Queue<Func<StageContext, Task<StageResult>>> SegmentClosed { get; } = new();

        public void Replies(string? run, ServiceTaskExchangeResult result) => Reply.Enqueue(Decides(run, result));

        public void Stages(string? run, StageResult result) => Middle.Enqueue(Decides(run, result));

        public void Concludes(string? run, ServiceTaskResult result) => Final.Enqueue(Decides(run, result));

        public void SegmentReplies(string? run, StageExchangeResult result) =>
            SegmentReply.Enqueue(Decides(run, result));

        public ServiceTaskPipeline DefineExecute(PipelineBuilder pipeline)
        {
            if (shape == Shape.Final)
            {
                return pipeline.Finally(context => Next(Final)(context));
            }

            pipeline.Stage(
                (context, _) => Next(Send)(context),
                new MailboxOptions { Timeout = TimeSpan.FromDays(3) },
                out MailboxHandle archive
            );
            if (shape == Shape.Segment)
            {
                return pipeline
                    .HandleReplies(
                        archive,
                        (context, _) => Next(SegmentReply)(context),
                        (context, _) => Next(SegmentClosed)(context)
                    )
                    .Finally(context => Next(Final)(context));
            }

            pipeline.Stage(context => Next(Middle)(context));
            pipeline.Stage(_ => Task.FromResult(StageResult.Completed()));
            return pipeline.ConcludeOnReplies(
                archive,
                (context, _) => Next(Reply)(context),
                (_, _) => throw new InvalidOperationException("No run is handed a closed mailbox.")
            );
        }

        private static T Next<T>(Queue<T> runs)
        {
            lock (runs)
            {
                return runs.Dequeue();
            }
        }
    }

    private static Func<StageContext, Task<TResult>> Decides<TResult>(string? run, TResult result) =>
        context =>
        {
            if (run is not null)
            {
                Instance instance = context.InstanceDataMutator.Instance;
                instance.DataValues ??= [];
                instance.DataValues[RunKey] = run;
            }

            return Task.FromResult(result);
        };

    /// <summary>One workflow the engine holds under an idempotency key, and the state it starts from.</summary>
    private sealed record EngineEntry(string Key, string Workflow, string State);

    private EngineEntry Receiver(int handlerIndex = HandlerIndex) =>
        new(
            _stepId.ToString(),
            $"{ProcessNextRequestFactory.MailboxReceiveOperationIdPrefix} Task_1 · after message 0 "
                + $"[{ExecuteServiceTask.Key}: {handlerIndex}] on {_mailboxId}",
            ""
        );

    private EngineEntry Continuation(params int[] itemIndexes) =>
        new(
            _stepId.ToString(),
            $"{ProcessNextRequestFactory.MailboxContinueOperationIdPrefix} Task_1 · after {SendIndex} "
                + $"[{string.Join(", ", itemIndexes.Select(index => $"{ExecuteServiceTask.Key}: {index}"))}]",
            ""
        );

    private EngineEntry AfterWorkflow(string? action) => new(_stepId.ToString(), $"process/next {action}", "");

    private EngineEntry AfterConclusion(string? action) => new($"after {_workflowId}", $"process/next {action}", "");

    /// <summary>
    /// The engine as the callback sees it: an enqueue under a key it already holds joins the workflow when it asks
    /// for the same one, and is answered 409 when it asks for another, as the engine does.
    /// </summary>
    private sealed class RecordingEngine : IWorkflowEngineClient
    {
        private readonly object _gate = new();
        private readonly List<EngineEntry> _entries = [];
        private readonly HashSet<Guid> _closed = [];

        public bool FailNextEnqueue { get; set; }

        public IReadOnlyList<EngineEntry> Entries
        {
            get
            {
                lock (_gate)
                {
                    return [.. _entries];
                }
            }
        }

        public IReadOnlyCollection<Guid> Closed
        {
            get
            {
                lock (_gate)
                {
                    return [.. _closed];
                }
            }
        }

        public void Enqueue(string key, string workflow, string state)
        {
            lock (_gate)
            {
                if (_entries.Find(entry => entry.Key == key) is { } existing)
                {
                    if (existing.Workflow != workflow)
                    {
                        throw new HttpRequestException(
                            $"409: key {key} holds '{existing.Workflow}', not '{workflow}'.",
                            null,
                            HttpStatusCode.Conflict
                        );
                    }

                    return;
                }

                _entries.Add(new EngineEntry(key, workflow, state));
            }
        }

        public Task<WorkflowEnqueueResponse.Accepted> EnqueueWorkflows(
            string ns,
            string idempotencyKey,
            string? collectionKey,
            WorkflowEnqueueRequest request,
            CancellationToken cancellationToken = default
        )
        {
            lock (_gate)
            {
                if (FailNextEnqueue)
                {
                    FailNextEnqueue = false;
                    throw new HttpRequestException("engine unreachable");
                }
            }

            WorkflowRequest workflow = Assert.Single(request.Workflows);
            string steps = string.Join(", ", workflow.Steps.Select(step => step.OperationId));
            string mailbox = workflow.Mailbox is { } target ? $" on {target.Id}" : "";
            Enqueue(idempotencyKey, $"{workflow.OperationId} [{steps}]{mailbox}", workflow.State!);
            return Task.FromResult(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = Guid.NewGuid(), Namespace = ns }],
                }
            );
        }

        public Task<MailboxResponse?> CloseMailbox(
            string ns,
            Guid mailboxId,
            CancellationToken cancellationToken = default
        )
        {
            lock (_gate)
            {
                _closed.Add(mailboxId);
            }

            return Task.FromResult<MailboxResponse?>(null);
        }

        public Task<MailboxDeliveryResult> DeliverToMailbox(
            string ns,
            Guid mailboxId,
            MailboxDeliveryRequest request,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<WorkflowStatusResponse?> GetWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<WorkflowCollectionDetailResponse?> GetCollection(
            string ns,
            string key,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<IReadOnlyList<WorkflowStatusResponse>> ListWorkflows(
            string ns,
            string? collectionKey = null,
            Dictionary<string, string>? labels = null,
            IReadOnlyList<PersistentItemStatus>? statuses = null,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<CancelWorkflowResponse> CancelWorkflow(
            string ns,
            Guid workflowId,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<ResumeWorkflowResponse> ResumeWorkflow(
            string ns,
            Guid workflowId,
            bool cascade = false,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();

        public Task<MailboxMintResult> MintMailbox(
            string ns,
            MailboxCreateRequest request,
            CancellationToken cancellationToken = default
        ) => throw new NotSupportedException();
    }

    private sealed record RunOutcome(HttpStatusCode Status, WorkflowCallbackState? Returned, string Body);

    private static string? ProblemTitle(RunOutcome run) =>
        JsonDocument.Parse(run.Body).RootElement.GetProperty("title").GetString();

    private static string ProblemDetail(RunOutcome run) =>
        JsonDocument.Parse(run.Body).RootElement.GetProperty("detail").GetString()!;

    private async Task Start(ScriptedTask task, byte[]? file = null)
    {
        _client = GetRootedClient(
            Org,
            App,
            configureServices: services =>
            {
                services.AddSingleton<IServiceTask>(task);
                services.AddSingleton<IWorkflowEngineClient>(_engine);
                // The test host's logging keeps warnings and errors only; the callback's information lines are asserted
                // on here.
                services.AddLogging(logging =>
                    logging.AddFilter(typeof(WorkflowEngineCallbackController).FullName, LogLevel.Information)
                );
                services.Configure<FakeLogCollectorOptions>(options => options.FilteredLevels.Clear());

                var processEngine = new Mock<IProcessEngine>();
                processEngine
                    .Setup(x =>
                        x.EnqueueProcessNext(
                            It.IsAny<IInstanceDataAccessor>(),
                            It.IsAny<Actor>(),
                            It.IsAny<Guid>(),
                            It.IsAny<string>(),
                            It.IsAny<string>(),
                            It.IsAny<DateTimeOffset>(),
                            It.IsAny<string?>(),
                            It.IsAny<string?>(),
                            It.IsAny<CancellationToken>()
                        )
                    )
                    .Callback<
                        IInstanceDataAccessor,
                        Actor,
                        Guid,
                        string,
                        string,
                        DateTimeOffset,
                        string?,
                        string?,
                        CancellationToken
                    >(
                        // Without a key of its own, the after-workflow is keyed on the workflow it depends on.
                        (_, _, workflowId, _, state, _, action, idempotencyKey, _) =>
                            _engine.Enqueue(idempotencyKey ?? $"after {workflowId}", $"process/next {action}", state)
                    )
                    .Returns(Task.CompletedTask);
                services.AddSingleton(processEngine.Object);
            }
        );
        _client.DefaultRequestHeaders.Add("Collection-Key", $"{InstanceOwnerPartyId}/{_instanceGuid}");
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer",
            Services.GenerateCallbackToken(_instanceGuid, commandKeys: [ExecuteServiceTask.Key])
        );

        var instance = new Instance
        {
            Id = $"{InstanceOwnerPartyId}/{_instanceGuid}",
            AppId = $"{Org}/{App}",
            Org = Org,
            InstanceOwner = new InstanceOwner { PartyId = InstanceOwnerPartyId.ToString() },
            Data = [],
            Process = new ProcessState
            {
                Status = ProcessStatus.Processing,
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
            },
        };
        await TestData.WriteInstance(instance);
        if (file is not null)
        {
            using var content = new MemoryStream(file);
            DataElementWithStorageMetadata inserted = await Services
                .GetRequiredService<IDataClientWithStorageMetadata>()
                .InsertBinaryDataWithStorageMetadata(
                    instance.Id,
                    FileDataType,
                    FileContentType,
                    "file.json",
                    content,
                    generatedFromTask: null,
                    StorageAuthenticationMethod.ServiceOwner(),
                    preconditions: null,
                    CancellationToken.None
                );
            instance.Data.Add(inserted.DataElement);
        }

        StorageVersionMetadata versions = Services.GetRequiredService<ApiTestStorageMetadata>().GetVersions(instance);
        var incoming = new WorkflowCallbackState
        {
            Instance = instance,
            InstanceVersion = versions.InstanceVersion!.Value,
            ProcessStateVersion = versions.ProcessStateVersion!.Value,
            FormData = [],
            Mailboxes = new Dictionary<string, CarriedMailbox>
            {
                ["0"] = new CarriedMailbox
                {
                    Id = _mailboxId,
                    Deadline = new DateTimeOffset(2026, 8, 30, 12, 0, 0, TimeSpan.Zero),
                },
            },
        };
        _incomingState = Services
            .GetRequiredService<WorkflowStateSigner>()
            .Sign(JsonSerializer.Serialize(incoming), SigningDomain.CallbackState);
    }

    /// <summary>Runs the step once more: the same step id, payload and incoming state on every run.</summary>
    private async Task<RunOutcome> RunStep(
        int itemIndex,
        bool delivered = true,
        Guid? stepId = null,
        bool closed = false
    )
    {
        var payload = new AppCallbackPayload
        {
            CommandKey = ExecuteServiceTask.Key,
            Actor = new Actor { Language = "nb" },
            ExecutionReferenceTime = DateTimeOffset.UnixEpoch,
            WorkflowId = _workflowId,
            StepId = stepId ?? _stepId,
            Mailbox =
                closed ? Closed()
                : delivered ? Delivered()
                : null,
            Payload = CommandPayloadSerializer.Serialize(new ExecuteServiceTaskPayload(ServiceTaskType, itemIndex)),
            State = _incomingState,
        };

        using var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
        using HttpResponseMessage response = await _client!.PostAsync(
            $"{Org}/{App}/instances/{InstanceOwnerPartyId}/{_instanceGuid}/workflow-engine-callbacks/{ExecuteServiceTask.Key}",
            content
        );

        string body = await response.Content.ReadAsStringAsync();
        WorkflowCallbackState? returned = null;
        if (response.StatusCode == HttpStatusCode.OK)
        {
            var callbackResponse = JsonSerializer.Deserialize<AppCallbackResponse>(body, JsonSerializerOptions);
            returned = ReadState(callbackResponse!.State!);
        }

        return new RunOutcome(response.StatusCode, returned, body);
    }

    private AppCallbackMailbox Delivered()
    {
        const string key = "archive-receipt-1";
        return new AppCallbackMailbox
        {
            Id = _mailboxId,
            Seq = 0,
            Delivery = new AppCallbackMailboxDelivery
            {
                IdempotencyKey = key,
                Payload = Services
                    .GetRequiredService<MailboxDeliveryEnvelope>()
                    .Wrap("<receipt/>", _mailboxId, ServiceTaskType, key),
                AcceptedAt = DateTimeOffset.UnixEpoch,
            },
        };
    }

    private static AppCallbackMailbox Closed() =>
        new()
        {
            Id = _mailboxId,
            Seq = 0,
            DisposedReason = MailboxDisposedReason.Deadline,
        };

    /// <summary>A save under this step's key that another run, of this version or another, committed first.</summary>
    private async Task CommitAsAnotherRun(string? callerResult)
    {
        WorkflowCallbackState incoming = ReadState(_incomingState!);
        var mutation = new StorageInstanceMutationRequest
        {
            ExpectedProcessStatus = ProcessStatus.Processing,
            CallerResult = callerResult,
        };
        mutation.DataValues[RunKey] = "other";
        await Services
            .GetRequiredService<IInstanceMutationClient>()
            .CommitInstanceMutationWithStorageMetadata(
                InstanceOwnerPartyId,
                _instanceGuid,
                mutation,
                new Dictionary<string, StorageInstanceMutationContent>(),
                StorageAuthenticationMethod.ServiceOwner(),
                new StorageWritePreconditions(
                    ProcessStateVersion: incoming.ProcessStateVersion,
                    InstanceVersion: incoming.InstanceVersion,
                    IdempotencyKey: _stepId.ToString()
                ),
                CancellationToken.None
            );
    }

    /// <summary>A save of a later step, which raises the instance past the version this step's save produced.</summary>
    private async Task CommitAsTheNextStep(WorkflowCallbackState after)
    {
        var mutation = new StorageInstanceMutationRequest { ExpectedProcessStatus = ProcessStatus.Processing };
        mutation.DataValues[RunKey] = "next";
        await Services
            .GetRequiredService<IInstanceMutationClient>()
            .CommitInstanceMutationWithStorageMetadata(
                InstanceOwnerPartyId,
                _instanceGuid,
                mutation,
                new Dictionary<string, StorageInstanceMutationContent>(),
                StorageAuthenticationMethod.ServiceOwner(),
                new StorageWritePreconditions(
                    ProcessStateVersion: after.ProcessStateVersion,
                    InstanceVersion: after.InstanceVersion,
                    IdempotencyKey: Guid.NewGuid().ToString()
                ),
                CancellationToken.None
            );
    }

    private WorkflowCallbackState ReadState(string state) =>
        JsonSerializer.Deserialize<WorkflowCallbackState>(
            Services.GetRequiredService<WorkflowStateSigner>().Verify(state, SigningDomain.CallbackState)
        )!;

    private Task<Instance> ReadStoredInstance() =>
        InstanceClientMockSi.ReadJsonFile<Instance>(
            TestData.GetInstancePath(Org, App, InstanceOwnerPartyId, _instanceGuid)
        );

    private Task<byte[]> ReadStoredFile(DataElement element) =>
        File.ReadAllBytesAsync(
            TestData.GetDataBlobPath(Org, App, InstanceOwnerPartyId, _instanceGuid, Guid.Parse(element.Id))
        );

    /// <summary>
    /// Storage holds the data of the run that committed; the engine holds at most the one continuation that run's
    /// result asks for, started on that data; every run that answered 200 answered with that data too.
    /// </summary>
    private async Task AssertAgreement(
        string? storedRun,
        EngineEntry? expectedEntry,
        bool mailboxClosed,
        params RunOutcome[] runs
    )
    {
        Assert.Equal(storedRun, (await ReadStoredInstance()).DataValues?.GetValueOrDefault(RunKey));

        if (expectedEntry is null)
        {
            Assert.Empty(_engine.Entries);
        }
        else
        {
            EngineEntry entry = Assert.Single(_engine.Entries);
            Assert.Equal(expectedEntry, entry with { State = "" });
            Assert.Equal(storedRun, ReadState(entry.State).Instance.DataValues?.GetValueOrDefault(RunKey));
        }

        Assert.Equal(mailboxClosed, _engine.Closed.Contains(_mailboxId));
        Assert.All(
            runs,
            run =>
            {
                Assert.Equal(HttpStatusCode.OK, run.Status);
                Assert.Equal(storedRun, run.Returned!.Instance.DataValues?.GetValueOrDefault(RunKey));
                Assert.Equal(!mailboxClosed, run.Returned.Mailboxes?.ContainsKey("0") is true);
            }
        );
    }
}
