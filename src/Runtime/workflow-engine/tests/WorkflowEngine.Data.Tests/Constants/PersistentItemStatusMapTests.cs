using System.Reflection;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Constants;

public class PersistentItemStatusMapTests
{
    private static readonly IReadOnlyCollection<PersistentItemStatus>[] _allCollections =
    [
        PersistentItemStatusMap.Incomplete,
        PersistentItemStatusMap.Fetchable,
        PersistentItemStatusMap.Successful,
        PersistentItemStatusMap.Failed,
        PersistentItemStatusMap.Finished,
    ];

    [Fact]
    public void AllEnumValues_AreCovered()
    {
        var covered = _allCollections.SelectMany(c => c).Distinct().Order();
        var allValues = Enum.GetValues<PersistentItemStatus>().Order();

        Assert.Equal(allValues, covered);
    }

    [Fact]
    public void SqlListConstants_MatchTheMapProperties()
    {
        // The constants exist so that raw SQL command texts stay compile-time constant, which
        // rule CA2100 demands of them. This pin is what makes interpolating them drift-safe.
        Assert.Equal(
            PersistentItemStatusMap.FinishedSqlList,
            PersistentItemStatusMap.ToSqlList(PersistentItemStatusMap.Finished)
        );
        Assert.Equal(
            PersistentItemStatusMap.IncompleteSqlList,
            PersistentItemStatusMap.ToSqlList(PersistentItemStatusMap.Incomplete)
        );
        Assert.Equal(
            PersistentItemStatusMap.FetchableSqlList,
            PersistentItemStatusMap.ToSqlList(PersistentItemStatusMap.Fetchable)
        );
    }

    [Fact]
    public void Fetchable_IsASubsetOfIncomplete_AndExcludesTheStatusesNoWorkerClaims()
    {
        // What this can honestly check is the set's relationship to the others. It cannot check it against
        // FetchAndLockWorkflows, whose SQL spells its three statuses out itself — the drift that is caught is
        // index-versus-set, not gate-versus-set.
        Assert.All(PersistentItemStatusMap.Fetchable, s => Assert.Contains(s, PersistentItemStatusMap.Incomplete));

        // Processing is already claimed; Held has not started and is released only by the event it waits on. Both
        // are unsettled, so only this set separates them from what a worker may pick up.
        Assert.DoesNotContain(PersistentItemStatus.Processing, PersistentItemStatusMap.Fetchable);
        Assert.DoesNotContain(PersistentItemStatus.Held, PersistentItemStatusMap.Fetchable);
    }

    [Fact]
    public void Held_IsUnsettledButNeverFetchable()
    {
        // Both halves are the status's meaning. Unfetchable is what makes "born parked" true; unsettled is what
        // makes the dependency gate hold dependents back with no gate changes, and what keeps retention from
        // purging a receiver that is still waiting.
        Assert.DoesNotContain(PersistentItemStatus.Held, PersistentItemStatusMap.Fetchable);

        Assert.Contains(PersistentItemStatus.Held, PersistentItemStatusMap.Incomplete);
        Assert.DoesNotContain(PersistentItemStatus.Held, PersistentItemStatusMap.Finished);
        Assert.DoesNotContain(PersistentItemStatus.Held, PersistentItemStatusMap.Failed);
        Assert.DoesNotContain(PersistentItemStatus.Held, PersistentItemStatusMap.Successful);
    }

    [Fact]
    public void AllCollections_AreRegistered()
    {
        var declaredCount = typeof(PersistentItemStatusMap)
            .GetProperties(BindingFlags.Public | BindingFlags.Static)
            .Count(p => typeof(IReadOnlyCollection<PersistentItemStatus>).IsAssignableFrom(p.PropertyType));

        Assert.Equal(declaredCount, _allCollections.Length);
    }
}
