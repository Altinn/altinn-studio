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
        Assert.Equal(
            PersistentItemStatusMap.ProcessingSqlLiteral,
            PersistentItemStatusMap.ToSqlList([PersistentItemStatus.Processing])
        );
        Assert.Equal(
            PersistentItemStatusMap.RequeuedSqlLiteral,
            PersistentItemStatusMap.ToSqlList([PersistentItemStatus.Requeued])
        );
    }

    [Fact]
    public void Fetchable_IsASubsetOfIncomplete_AndExcludesTheStatusesNoWorkerClaims()
    {
        // Both the partial index and FetchAndLockWorkflows interpolate FetchableSqlList, so this
        // pin covers the fetch gate as well as the index.
        Assert.All(PersistentItemStatusMap.Fetchable, s => Assert.Contains(s, PersistentItemStatusMap.Incomplete));

        Assert.DoesNotContain(PersistentItemStatus.Processing, PersistentItemStatusMap.Fetchable);
        Assert.DoesNotContain(PersistentItemStatus.Held, PersistentItemStatusMap.Fetchable);
    }

    [Fact]
    public void Held_IsUnsettledButNeverFetchable()
    {
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
