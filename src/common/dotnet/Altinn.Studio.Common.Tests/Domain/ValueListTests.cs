using System.Collections.Generic;
using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Xunit;

namespace Altinn.Studio.Common.Tests.Domain;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class ValueListTests
{
    [Fact]
    public void Equals_ComparesTheItemsInOrder()
    {
        ValueList<string> list = ["a", "b"];

        Assert.True(list == ["a", "b"]);
        Assert.True(list != ["b", "a"]);
        Assert.True(list != ["a"]);
        Assert.True(list != ["a", "b", "c"]);
        Assert.True(list.Equals((object)ValueList.Create<string>(["a", "b"])));
        Assert.False(list.Equals((object)"a"));
        Assert.Equal(list.GetHashCode(), ValueList.Create<string>(["a", "b"]).GetHashCode());
    }

    [Fact]
    public void Equals_ComparesItemsByValue()
    {
        ValueList<PackageReference> list = [new("Altinn.App.Api", "8.0.0"), new("Other", null)];
        ValueList<ValueList<int>> nested =
        [
            [1, 2],
            [],
        ];

        Assert.True(list == [new("Altinn.App.Api", "8.0.0"), new("Other", null)]);
        Assert.True(list != [new("Altinn.App.Api", "9.0.0"), new("Other", null)]);
        Assert.True(
            nested
                ==
                [
                    [1, 2],
                    [],
                ]
        );
        Assert.True(
            nested
                !=
                [
                    [1, 2],
                    [3],
                ]
        );
    }

    [Fact]
    public void Default_IsTheEmptyList()
    {
        ValueList<string?> list = default;

        Assert.Empty(list);
        Assert.True(list == []);
        Assert.Equal(list.GetHashCode(), ValueList.Create<string?>([]).GetHashCode());
        Assert.Equal("[]", list.ToString());
        Assert.True(ValueList.Create<string?>([null]) != list);
    }

    [Fact]
    public void Create_CopiesTheItems()
    {
        string[] items = ["a", "b"];
        ValueList<string> list = [.. items];

        items[0] = "changed";

        Assert.Equal("a", list[0]);
        Assert.Equal(2, list.Count);
        Assert.Equal(["a", "b"], new List<string>(list));
        Assert.Equal("[a, b]", list.ToString());
    }
}
