using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Studio.Designer.Helpers;
using Xunit;

namespace Designer.Tests.Helpers;

public class ApplicationMetadataJsonHelperTests
{
    [Theory]
    [InlineData("""{ "status": "Completed" }""", AppStatus.Completed)]
    [InlineData("""{ "status": "completed" }""", AppStatus.Completed)]
    [InlineData("""{ "status": "UNDERDEVELOPMENT" }""", AppStatus.UnderDevelopment)]
    [InlineData("""{ "Id": "ttd/app", "Status": "completed" }""", AppStatus.Completed)]
    public void GetStatus_IgnoresTheCaseOfTheValue(string json, AppStatus expectedStatus)
    {
        Assert.Equal(expectedStatus, ApplicationMetadataJsonHelper.GetStatus(json));
    }

    [Theory]
    [InlineData("""{ "id": "ttd/app" }""")]
    [InlineData("""{ "status": "Done" }""")]
    [InlineData("""{ "status": null }""")]
    [InlineData("""{ "status": { "value": "Completed" } }""")]
    public void GetStatus_WithoutAKnownStatus_ReturnsNull(string json)
    {
        Assert.Null(ApplicationMetadataJsonHelper.GetStatus(json));
    }
}
