using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Core.Configuration;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.Tests.Extensions;

public class InstanceExtensionsTests
{
    private static Instance GetInstance(
        string? instanceId = null,
        string? appId = null,
        IEnumerable<string>? dataTypes = null
    )
    {
        return new Instance
        {
            Id = instanceId,
            AppId = appId,
            Data = dataTypes?.Select(x => new DataElement { DataType = x }).ToList(),
        };
    }

    [Fact]
    public void GetOptionalDataElements_ReturnsCorrectElements()
    {
        // Arrange
        var instance = GetInstance(dataTypes: ["type1", "TYPE1", "type2"]);

        // Act
        var result = instance.GetOptionalDataElements("Type1").ToList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("type1", result[0].DataType);
        Assert.Equal("TYPE1", result[1].DataType);
    }

    [Fact]
    public void GetOptionalDataElements_NoMatchingElements_ReturnsEmpty()
    {
        // Arrange
        var instance = GetInstance(dataTypes: ["type2"]);

        // Act
        var result = instance.GetOptionalDataElements("type1");

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public void GetRequiredDataElement_ReturnsCorrectElement()
    {
        // Arrange
        var instance = GetInstance(dataTypes: ["type1", "type2"]);

        // Act
        var result = instance.GetRequiredDataElement("TYPE1");

        // Assert
        Assert.Equal("type1", result.DataType);
    }

    [Fact]
    public void GetRequiredDataElement_NoMatchingElement_ThrowsException()
    {
        // Arrange
        var instance = GetInstance(dataTypes: ["type1"]);

        // Act
        var ex = Record.Exception(() => instance.GetRequiredDataElement("type2"));

        // Assert
        Assert.IsType<FiksArkivException>(ex);
    }

    [Fact]
    public void GetInstanceUrl_ProducesCorrectUrl()
    {
        // Arrange
        var generalSettings = new GeneralSettings();
        var instanceId = $"12345/{Guid.NewGuid()}";
        var appId = "ttd/the-app";
        var expectedUrl = $"http://{generalSettings.HostName}/{appId}/instances/{instanceId}";
        var instance = GetInstance(instanceId: instanceId, appId: appId);

        // Act
        var result = instance.GetInstanceUrl(generalSettings);

        // Assert
        Assert.Equal(expectedUrl, result);
    }
}
