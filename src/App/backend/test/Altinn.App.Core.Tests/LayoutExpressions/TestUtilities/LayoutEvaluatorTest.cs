using Altinn.App.Core.Internal.Expressions;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;

public class LayoutEvaluatorTest
{
    [Fact]
    public void OrderByListIndexReverse_OrdersByDataElementIdentifierDescending_ThenFieldDescending()
    {
        var id0 = new DataElementIdentifier(Guid.Empty);
        var id1 = new DataElementIdentifier(Guid.NewGuid());
        var expected = new List<DataReference>
        {
            new() { DataElementIdentifier = id1, Field = "field[35]" },
            new() { DataElementIdentifier = id1, Field = "field[5]" },
            new() { DataElementIdentifier = id1, Field = "field[4]" },
            new() { DataElementIdentifier = id0, Field = "melding.list[10].id" },
            new() { DataElementIdentifier = id0, Field = "melding.list[9].id" },
            new() { DataElementIdentifier = id0, Field = "melding.list[8].id" },
            new() { DataElementIdentifier = id0, Field = "field1" },
        };
        var randomized = expected.ToArray();
        Random.Shared.Shuffle(randomized);

        var ordered = LayoutEvaluator.OrderByListIndexReverse(randomized.ToList()).ToList();

        Assert.Equal(expected, ordered);
    }

    [Fact]
    public void OrderByListIndexReverse_HandlesEmptyList()
    {
        var fields = new List<DataReference>();
        var ordered = LayoutEvaluator.OrderByListIndexReverse(fields).ToList();
        Assert.Empty(ordered);
    }

    [Fact]
    public void OrderByListIndexReverse_HandlesSingleElement()
    {
        var id = new DataElementIdentifier(Guid.Empty);
        var fields = new List<DataReference>
        {
            new() { DataElementIdentifier = id, Field = "fieldA" },
        };
        var ordered = LayoutEvaluator.OrderByListIndexReverse(fields).ToList();
        Assert.Single(ordered);
        Assert.Equal(id, ordered[0].DataElementIdentifier);
        Assert.Equal("fieldA", ordered[0].Field);
    }
}
