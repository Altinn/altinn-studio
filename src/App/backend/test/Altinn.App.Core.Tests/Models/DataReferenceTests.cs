using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Layout;

namespace Altinn.App.Core.Tests.Models;

public class DataReferenceTests
{
    [Theory]
    [InlineData("a.b.c", "a.b")]
    [InlineData("a.b[3].e.c", "a.b")]
    [InlineData("a.b", "a.b")]
    public void TestStartsWithTrue(string full, string start)
    {
        DataElementIdentifier dataElementIdentifier = new(Guid.NewGuid());
        var fullReference = new DataReference { Field = full, DataElementIdentifier = dataElementIdentifier };
        var startReference = new DataReference { Field = start, DataElementIdentifier = dataElementIdentifier };

        Assert.True(fullReference.StartsWith(startReference));
    }

    [Theory]
    [InlineData("a.be.c", "a.b")]
    [InlineData("a.be[].c", "a.b")]
    [InlineData("a.b[].c", "a.be")]
    public void TestStartsWithFalse(string full, string start)
    {
        DataElementIdentifier dataElementIdentifier = new(Guid.NewGuid());
        var fullReference = new DataReference { Field = full, DataElementIdentifier = dataElementIdentifier };
        var startReference = new DataReference { Field = start, DataElementIdentifier = dataElementIdentifier };

        Assert.False(fullReference.StartsWith(startReference));
    }

    [Fact]
    public void TestStartsWithDifferentElements()
    {
        var fullReference = new DataReference
        {
            Field = "a.b",
            DataElementIdentifier = new DataElementIdentifier(Guid.NewGuid()),
        };

        var startReference = new DataReference
        {
            Field = "a.b",
            DataElementIdentifier = new DataElementIdentifier(Guid.NewGuid()),
        };

        Assert.False(fullReference.StartsWith(startReference));
    }
}
