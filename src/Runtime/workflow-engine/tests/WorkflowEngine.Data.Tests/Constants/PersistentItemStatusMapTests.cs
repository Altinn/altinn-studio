using System.Reflection;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;

namespace WorkflowEngine.Data.Tests.Constants;

public class PersistentItemStatusMapTests
{
    private static readonly IReadOnlyCollection<PersistentItemStatus>[] _allCollections =
    [
        PersistentItemStatusMap.Incomplete,
        PersistentItemStatusMap.Successful,
        PersistentItemStatusMap.Failed,
    ];

    [Fact]
    public void AllEnumValues_AreCovered()
    {
        var covered = _allCollections.SelectMany(c => c).Order();
        var allValues = Enum.GetValues<PersistentItemStatus>().Order();

        Assert.Equal(allValues, covered);
    }

    [Fact]
    public void Collections_HaveNoOverlaps()
    {
        var allMapped = _allCollections.SelectMany(c => c).ToList();

        Assert.Equal(allMapped.Distinct().Count(), allMapped.Count);
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
