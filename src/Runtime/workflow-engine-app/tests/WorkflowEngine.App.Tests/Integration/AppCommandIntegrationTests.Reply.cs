using System.Text.Json;
using WorkflowEngine.App.Commands.AppCommand;
using WorkflowEngine.Models;

namespace WorkflowEngine.App.Tests.Integration;

public sealed partial class AppCommandIntegrationTests
{
    [Fact]
    public async Task AppCommand_WaitForReplyFrom_UsesReplyIdToSubmitReply_AndCompletes()
    {
        const string producerCommand = "/reply-producer";
        const string consumerCommand = "/reply-consumer";
        const string replyPayload = "reply-from-app";

        var submitReplyTask = Task.Run(
            async () =>
            {
                using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
                    TestContext.Current.CancellationToken
                );
                linkedCts.CancelAfter(TimeSpan.FromSeconds(10));

                var replyId = await WaitForReplyIdFromProducerCallback(producerCommand, linkedCts.Token);

                await Task.Delay(100, linkedCts.Token);
                await _client.SubmitReply(
                    replyId,
                    $"idem-reply-{Guid.NewGuid()}",
                    new SubmitReplyRequest { Payload = replyPayload }
                );
            },
            TestContext.Current.CancellationToken
        );

        var steps = new[]
        {
            _testHelpers.CreateAppCommandStep(producerCommand) with
            {
                Ref = "producer",
            },
            _testHelpers.CreateAppCommandStep(consumerCommand) with
            {
                WaitForReplyFrom = "producer",
            },
        };

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", steps),
            lockToken: InstanceLockToken
        );

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;

        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
        await submitReplyTask;

        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(2, status.Steps.Count);
        Assert.All(status.Steps, s => Assert.Equal(PersistentItemStatus.Completed, s.Status));

        var consumerPayload = fixture
            .WireMock.LogEntries.Select(x => TryDeserializePayload(x.RequestMessage.Body))
            .LastOrDefault(x => x?.CommandKey == consumerCommand);

        Assert.NotNull(consumerPayload);
        Assert.Equal(replyPayload, consumerPayload!.Reply);
    }

    private async Task<Guid> WaitForReplyIdFromProducerCallback(
        string producerCommand,
        CancellationToken cancellationToken
    )
    {
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();

            foreach (var logEntry in fixture.WireMock.LogEntries)
            {
                var payload = TryDeserializePayload(logEntry.RequestMessage.Body);
                if (payload?.CommandKey != producerCommand)
                    continue;

                if (payload.ReplyId is Guid replyId && replyId != Guid.Empty)
                    return replyId;
            }

            await Task.Delay(50, cancellationToken);
        }
    }

    private static AppCallbackPayload? TryDeserializePayload(string? body)
    {
        if (string.IsNullOrWhiteSpace(body))
            return null;

        try
        {
            return JsonSerializer.Deserialize<AppCallbackPayload>(body);
        }
        catch (JsonException)
        {
            return null;
        }
    }
}
