using Altinn.App.Clients.Fiks.Extensions;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.Tests.Extensions;

public class DataElementsExtensionsTests
{
    [Theory]
    [InlineData("APPLICATION/xml", ".xml")]
    [InlineData("teXT/XmL", ".xml")]
    [InlineData("application/pdf", ".pdf")]
    [InlineData("application/json", ".json")]
    [InlineData("something/unknown", null)]
    public void GetExtensionForMimeType_ReturnsCorrectExtension(string mimeType, string? expectedExtension)
    {
        // Arrange
        var dataElement = new DataElement { ContentType = mimeType };

        // Act
        var result = dataElement.GetExtensionForContentType();

        // Assert
        Assert.Equal(expectedExtension, result);
    }
}
