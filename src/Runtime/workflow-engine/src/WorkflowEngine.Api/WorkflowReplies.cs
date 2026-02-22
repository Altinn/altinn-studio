using System.Collections.Concurrent;
using Altinn.Studio.Runtime.Common;
using Npgsql;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal class WorkflowReplies(IServiceScopeFactory _serviceScopeFactory, TimeProvider _timeProvider)
{
    private readonly ConcurrentDictionary<Guid, Reply> _repliesByCorrelationId = new();

    public async Task<ReplyResponse> ReceiveReply(
        ReplyRequest request,
        Guid correlationId,
        CancellationToken cancellationToken
    )
    {
        using var activity = Telemetry.Source.StartActivity("WorkflowReplies.ReceiveReply");

        using var scope = _serviceScopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

        var workflow = await repository.GetWorkflowByCorrelationId(correlationId, cancellationToken);
        if (workflow is null)
        {
            return ReplyResponse.WorkflowNotFound;
        }

        var step = workflow.Steps.FirstOrDefault(s =>
            s.CorrelationId == correlationId && s.Command is Command.ReplyAppCommand
        );
        if (step is null)
        {
            return ReplyResponse.StepNotFound;
        }

        if (step.Command is not Command.ReplyAppCommand)
        {
            return ReplyResponse.StepNotReplyAppCommand;
        }

        var reply = new Reply
        {
            ReplyId = Guid.NewGuid(), // TODO: Remove
            StepId = step.DatabaseId,
            Payload = request.Payload,
            CreatedAt = _timeProvider.GetUtcNow(),
        };

        if (_repliesByCorrelationId.TryGetValue(correlationId, out var existingReply))
        {
            if (existingReply.StepId != reply.StepId || existingReply.Payload != reply.Payload)
            {
                return ReplyResponse.Mismatch;
            }

            return ReplyResponse.Exists;
        }

        Reply? existingDbReply = null;
        try
        {
            await repository.AddReply(reply, cancellationToken);
        }
        catch (Exception e)
            when (e.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            existingDbReply = await repository.GetReplyForStep(step.DatabaseId, cancellationToken);
            Assert.That(existingDbReply is not null);
            if (existingDbReply.StepId != reply.StepId || existingDbReply.Payload != reply.Payload)
            {
                return ReplyResponse.Mismatch;
            }
        }

        _repliesByCorrelationId.TryAdd(correlationId, existingDbReply ?? reply);

        return ReplyResponse.Received;
    }

    public async Task<Reply?> GetReplyByCorrelationId(Guid correlationId, CancellationToken cancellationToken = default)
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
        return await repository.GetReplyByCorrelationId(correlationId, cancellationToken);
    }
}

internal enum ReplyResponse
{
    Exists,
    Mismatch,
    Received,
    WorkflowNotFound,
    StepNotFound,
    StepNotReplyAppCommand,
}
