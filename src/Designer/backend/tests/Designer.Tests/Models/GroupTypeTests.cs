using System.Text.Json;
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Designer.Tests.Models;

/// <summary>Verifies the enum serializes to the JSON values the app runtime accepts.</summary>
public class GroupTypeTests
{
    [Theory]
    [InlineData(GroupType.Default, "default")]
    [InlineData(GroupType.Info, "info")]
    public void SerializesToTheValueTheAppAccepts(GroupType value, string expected)
    {
        Assert.Equal($"\"{expected}\"", JsonSerializer.Serialize(value));
    }
}
