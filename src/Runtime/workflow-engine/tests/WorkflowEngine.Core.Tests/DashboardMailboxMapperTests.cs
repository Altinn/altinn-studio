using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests for the one derivation the dashboard's mailbox card performs: naming a position's state from the two
/// sides of the rendezvous standing at it.
/// </summary>
public class DashboardMailboxMapperTests
{
    private static readonly DateTimeOffset _at = new(2026, 8, 19, 12, 0, 0, TimeSpan.Zero);

    private static MailboxPosition Position(
        bool delivery,
        bool receiver,
        DateTimeOffset? heldAt = null,
        DateTimeOffset? releasedAt = null
    ) =>
        new(
            Position: 7,
            DeliveryIdempotencyKey: delivery ? "source-msg-7" : null,
            AcceptedAt: delivery ? _at : null,
            ReceiverWorkflowId: receiver ? Guid.Parse("018f4e00-0000-7000-8000-0000000000aa") : null,
            HeldAt: heldAt,
            ReleasedAt: releasedAt,
            ClaimedAt: null
        );

    // Every shape the rendezvous can leave at a position; the cases are named in the arguments.
    [InlineData("message only", true, false, false, false, "delivered")]
    [InlineData("parked receiver", false, true, true, false, "waiting")]
    [InlineData("receiver woken by its message", true, true, true, true, "consumed")]
    [InlineData("receiver born with its message", true, true, false, true, "consumed")]
    [InlineData("receiver released by the closure", false, true, true, true, "closed")]
    [InlineData("receiver born with the closing signal", false, true, false, true, "closed")]
    [Theory]
    public void MapMailboxPosition_NamesEveryStateTheRendezvousCanLeaveAtAPosition(
        string shape,
        bool delivery,
        bool receiver,
        bool held,
        bool released,
        string expectedState
    )
    {
        var position = Position(
            delivery,
            receiver,
            heldAt: held ? _at : null,
            releasedAt: released ? _at.AddSeconds(30) : null
        );

        var dto = DashboardMapper.MapMailboxPosition(position);

        Assert.Equal(expectedState, dto.State);
        Assert.Equal(7, dto.Position);
        Assert.NotNull(shape);
    }

    [Fact]
    public void MapMailboxPosition_ReportsAParkDurationOnlyForAReceiverThatActuallyParked()
    {
        var parked = DashboardMapper.MapMailboxPosition(
            Position(delivery: true, receiver: true, heldAt: _at, releasedAt: _at.AddSeconds(90))
        );
        Assert.Equal(90, parked.ParkedForSeconds);

        var neverParked = DashboardMapper.MapMailboxPosition(Position(delivery: true, receiver: true, releasedAt: _at));
        Assert.Null(neverParked.ParkedForSeconds);

        var stillParked = DashboardMapper.MapMailboxPosition(Position(delivery: false, receiver: true, heldAt: _at));
        Assert.Null(stillParked.ParkedForSeconds);
        Assert.Equal(_at, stillParked.HeldAt);
    }

    [Fact]
    public void MapMailbox_CarriesTheDeadlineTheCountersAndTheUnconsumedCount()
    {
        var mailbox = new MailboxResponse
        {
            Id = Guid.Parse("018f4e00-0000-7000-8000-0000000000bb"),
            Namespace = "ttd/app",
            IdempotencyKey = "Task_1:SendToArchive",
            CollectionKey = "instance-42",
            Timeout = TimeSpan.FromHours(2),
            Deadline = _at.AddHours(2),
            Status = MailboxStatus.Disposed,
            DisposedReason = MailboxDisposedReason.Deadline,
            NextIdx = 3,
            NextSeq = 1,
            CreatedAt = _at,
            DisposedAt = _at.AddHours(2),
        };

        var dto = DashboardMapper.MapMailbox(
            new MailboxSnapshot(mailbox, [Position(delivery: true, receiver: true, releasedAt: _at)])
        );

        Assert.Equal(mailbox.Id, dto.Id);
        Assert.Equal("instance-42", dto.CollectionKey);
        Assert.Equal("Disposed", dto.Status);
        Assert.Equal("Deadline", dto.DisposedReason);
        Assert.Equal(_at.AddHours(2), dto.Deadline);
        Assert.Equal(3, dto.NextIdx);
        Assert.Equal(1, dto.NextSeq);
        Assert.Equal(2, dto.UnconsumedDeliveries);
        Assert.Equal("consumed", Assert.Single(dto.Positions).State);
    }

    [Fact]
    public void MapMailbox_OfAMintedMailboxWithNoPositions_RendersAsAMailboxWithAnEmptyLog()
    {
        var mailbox = new MailboxResponse
        {
            Id = Guid.Parse("018f4e00-0000-7000-8000-0000000000cc"),
            Namespace = "ttd/app",
            IdempotencyKey = "Task_1:SendToArchive",
            CollectionKey = "instance-42",
            Timeout = TimeSpan.FromHours(2),
            Deadline = _at.AddHours(2),
            Status = MailboxStatus.Open,
            NextIdx = 0,
            NextSeq = 0,
            CreatedAt = _at,
        };

        var dto = DashboardMapper.MapMailbox(new MailboxSnapshot(mailbox, []));

        Assert.Equal("Open", dto.Status);
        Assert.Null(dto.DisposedReason);
        Assert.Null(dto.DisposedAt);
        Assert.Equal(0, dto.UnconsumedDeliveries);
        Assert.Empty(dto.Positions);
    }
}
