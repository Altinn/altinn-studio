using Altinn.App.Core.Internal.Data;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Tests.Internal.Data;

public class DataTypeComparerTest
{
    [Fact]
    public void ComparerWorksAsExpected()
    {
        // Arrange
        var dt1 = new DataType { Id = Guid.NewGuid().ToString() };
        var dt2 = new DataType { Id = dt1.Id };
        var dt3 = new DataType { Id = Guid.NewGuid().ToString() };
        var dict = new Dictionary<DataType, string>(DataTypeComparer.Instance);

        // Act
        dict[dt1] = "first";
        dict[dt2] = "second";
        dict[dt3] = "third";
        dict[dt3] = "third-dupe";

        // Assert
        Assert.Equal(2, dict.Count);
        Assert.Equal("second", dict[dt1]);
        Assert.Equal("second", dict[dt2]);
        Assert.Equal("third-dupe", dict[dt3]);
    }
}
