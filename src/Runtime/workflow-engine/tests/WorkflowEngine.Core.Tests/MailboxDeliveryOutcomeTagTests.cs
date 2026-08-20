using System.Reflection;
using WorkflowEngine.Core;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Covers the delivery-outcome metric tag for every result the ingestion path can produce. Each value names a
/// different problem with a different fix, so a result mapped to the wrong tag would be invisible in exactly
/// the situation the metric exists for. Covered here rather than through the endpoint because the mapping is
/// pure and some outcomes cost a filled log or an oversized payload to reach.
/// </summary>
public sealed class MailboxDeliveryOutcomeTagTests
{
    private static readonly MailboxDeliveryResponse _delivery = new()
    {
        MailboxId = Guid.CreateVersion7(),
        Idx = 0,
        IdempotencyKey = "source-msg-1",
        AcceptedAt = DateTimeOffset.UtcNow,
    };

    private static readonly MailboxResponse _mailbox = new()
    {
        Id = Guid.CreateVersion7(),
        Namespace = "test-ns",
        IdempotencyKey = "step-1",
        Timeout = TimeSpan.FromHours(1),
        Deadline = DateTimeOffset.UtcNow.AddHours(1),
        Status = MailboxStatus.Disposed,
        DisposedReason = MailboxDisposedReason.Request,
        NextIdx = 0,
        NextSeq = 0,
        CreatedAt = DateTimeOffset.UtcNow,
        DisposedAt = DateTimeOffset.UtcNow,
    };

    /// <summary>
    /// Every delivery outcome paired with the tag it must report. Adding a result without adding it here fails
    /// <see cref="EveryDeliveryOutcome_IsCovered"/>.
    /// </summary>
    private static readonly (MailboxDeliveryResult Result, string Tag)[] _cases =
    [
        (new MailboxDeliveryResult.Accepted(_delivery, ReleasedReceiver: false), "accepted"),
        (new MailboxDeliveryResult.Duplicate(_delivery), "duplicate"),
        (new MailboxDeliveryResult.NotFound(), "not_found"),
        (new MailboxDeliveryResult.Closed(_mailbox), "closed"),
        (new MailboxDeliveryResult.LogFull(100), "log_full"),
        (new MailboxDeliveryResult.PayloadTooLarge("too big"), "too_large"),
        (new MailboxDeliveryResult.Invalid("blank key"), "invalid"),
    ];

    public static TheoryData<int> CaseIndices => [.. Enumerable.Range(0, _cases.Length)];

    [Theory]
    [MemberData(nameof(CaseIndices))]
    public void DeliveryOutcome_MapsToItsTag(int index)
    {
        var (result, tag) = _cases[index];

        Assert.Equal(tag, Engine.MailboxDeliveryOutcomeTag(result));
    }

    [Fact]
    public void EveryDeliveryOutcome_IsCovered()
    {
        // The mapping's switch has an UnreachableException default, so an uncovered result would throw at runtime
        // inside the metric line of a request that had otherwise succeeded. Enumerating the type's own nested
        // results is what makes this test notice a new one.
        var declared = typeof(MailboxDeliveryResult)
            .GetNestedTypes(BindingFlags.Public | BindingFlags.NonPublic)
            .Where(t => t.IsSealed && typeof(MailboxDeliveryResult).IsAssignableFrom(t))
            .ToArray();

        Assert.Equal(declared.Length, _cases.Length);
        Assert.Equal(declared.Select(t => t.Name).Order(), _cases.Select(c => c.Result.GetType().Name).Order());
    }

    [Fact]
    public void DeliveryOutcomeTags_AreDistinct()
    {
        // Two outcomes sharing a tag would silently merge two different problems into one series.
        Assert.Equal(_cases.Length, _cases.Select(c => c.Tag).Distinct(StringComparer.Ordinal).Count());
    }
}
