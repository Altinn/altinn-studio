using System.Text.Json;
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Designer.Tests.Models;

/// <summary>Verifies the enum serializes to the JSON values the app runtime accepts.</summary>
public class AutoSaveBehaviorTypeTests
{
    [Theory]
    [InlineData(AutoSaveBehaviorType.OnChangeFormData, "onChangeFormData")]
    [InlineData(AutoSaveBehaviorType.OnChangePage, "onChangePage")]
    public void SerializesToTheValueTheAppAccepts(AutoSaveBehaviorType value, string expected)
    {
        Assert.Equal($"\"{expected}\"", JsonSerializer.Serialize(value));
    }
}
