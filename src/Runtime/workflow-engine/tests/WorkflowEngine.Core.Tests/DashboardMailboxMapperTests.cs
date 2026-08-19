using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests for the one derivation the dashboard's mailbox card performs: naming a position's state from the
/// two sides of the rendezvous standing at it. Pure and exhaustive, following the split the mailbox steps
/// have used throughout — wiring proved once against a real database, mappings proved over every input.
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

    // Every shape the rendezvous can leave at a position, as the four facts a card can see: whether a
    // message stands there, whether a receiver holds it, and whether that receiver ever parked and was
    // ever released. The cases are named in the arguments rather than in comments so a failure says which
    // one broke.
    //
    // A message with nobody enqueued for it — the unconsumed delivery.
    [InlineData("message only", true, false, false, false, "delivered")]
    // A receiver parked with nothing at its position: the exchange is waiting on a counterparty.
    [InlineData("parked receiver", false, true, true, false, "waiting")]
    // Woken by its message: it parked, and then the delivery released it.
    [InlineData("receiver woken by its message", true, true, true, true, "consumed")]
    // Born runnable with its message already there — never parked, so no held stamp.
    [InlineData("receiver born with its message", true, true, false, true, "consumed")]
    // Parked, then released by the mailbox closing: no message ever came, and the wait is over. This is the
    // state the three the proposal names cannot express, and folding it into either of its neighbors would
    // misreport how a timed-out exchange ends.
    [InlineData("receiver released by the closure", false, true, true, true, "closed")]
    // Born with the closing signal: the mailbox was already closed when it was enqueued, so it never waited
    // and never had a message either.
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
        // Zero would be a claim rather than an absence: a receiver born runnable did not wait for nothing,
        // it never waited. Null is what lets a card leave the column blank for it, and it is why held_at
        // rather than released_at is what the subtraction is anchored on.
        var parked = DashboardMapper.MapMailboxPosition(
            Position(delivery: true, receiver: true, heldAt: _at, releasedAt: _at.AddSeconds(90))
        );
        Assert.Equal(90, parked.ParkedForSeconds);

        var neverParked = DashboardMapper.MapMailboxPosition(Position(delivery: true, receiver: true, releasedAt: _at));
        Assert.Null(neverParked.ParkedForSeconds);

        // And still parked: the interval has no end yet, so the server reports none and the card counts up
        // from heldAt.
        var stillParked = DashboardMapper.MapMailboxPosition(Position(delivery: false, receiver: true, heldAt: _at));
        Assert.Null(stillParked.ParkedForSeconds);
        Assert.Equal(_at, stillParked.HeldAt);
    }

    [Fact]
    public void MapMailbox_CarriesTheDeadlineTheCountersAndTheUnconsumedCount()
    {
        // The mailbox's own facts, and the three numbers an operator reads together: how many messages
        // arrived, how many receivers were enqueued, and the gap between them.
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
        // The window between the mint and the first receiver, which a card must still show — an exchange
        // whose reply address has gone out and whose counterparty has not answered is exactly what somebody
        // is watching the dashboard for. Nothing about this shape is a special case in the mapper; the test
        // is here because it is the shape most likely to be broken by a rewrite that assumes a log.
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
