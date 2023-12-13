using System.Text;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Altinn.App.Core.Helpers.Serialization;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Altinn.App.Core.Tests.Helpers;

public class ModelDeserializerTests
{
    private readonly ILogger _logger = new Mock<ILogger>().Object;

    [XmlRoot("melding")]
    public class Melding
    {
        [JsonPropertyName("test")]
        [XmlElement("test")]
        public string Test { get; set; }
    }

    [Fact]
    public async Task TestDeserializeJson()
    {
        // Arrange
        string json = @"{""test"":""test""}";

        // Act
        var deserializer = new ModelDeserializer(_logger, typeof(Melding));
        var result = await deserializer.DeserializeAsync(new MemoryStream(Encoding.UTF8.GetBytes(json)), "application/json");

        // Assert
        result.HasError.Should().BeFalse();
        result.Model.Should().BeOfType<Melding>().Which.Test.Should().Be("test");
    }

    [Fact]
    public async Task TestDeserializeXml()
    {
        // Arrange
        string json = "<melding><test>test</test></melding>";

        // Act
        var deserializer = new ModelDeserializer(_logger, typeof(Melding));
        var result = await deserializer.DeserializeAsync(new MemoryStream(Encoding.UTF8.GetBytes(json)), "application/xml");

        // Assert
        result.HasError.Should().BeFalse(result.Error);
        result.Model.Should().BeOfType<Melding>().Which.Test.Should().Be("test");
    }

    [Fact]
    public async Task TestDeserializeInvalidXml()
    {
        // Arrange
        string json = "<melding><testFail>test</estFail></melding>";

        // Act
        var deserializer = new ModelDeserializer(_logger, typeof(Melding));
        var result = await deserializer.DeserializeAsync(new MemoryStream(Encoding.UTF8.GetBytes(json)), "application/xml");

        // Assert
        result.HasError.Should().BeTrue();
        result.Error.Should().Contain("The 'testFail' start tag on line 1 position 11 does not match the end tag of 'estFail'. Line 1, position 26.");
    }

    [Fact]
    public async Task TestDeserializeMultipartWithInvalidFirstContent()
    {
        // Arrange
        string json = @"{""test"":""test""}";
        using var requestContent = new MultipartFormDataContent();
        requestContent.Add(new StringContent(json, Encoding.UTF8, "application/json"), "ddddd");
        requestContent.Add(new StringContent("invalid", Encoding.UTF8, "application/xml"), "dddd");

        // Act
        var deserializer = new ModelDeserializer(_logger, typeof(Melding));

        var result = await deserializer.DeserializeAsync(await requestContent.ReadAsStreamAsync(), requestContent.Headers.ContentType!.ToString());

        // Assert
        result.HasError.Should().BeTrue();
        result.Error.Should().Contain("First entry in multipart serialization must have name=\"dataModel\"");
    }

    [Fact]
    public async Task TestDeserializeMultipartWithInvalidSecondContent()
    {
        // Arrange
        string json = @"{""test"":""test""}";
        using var requestContent = new MultipartFormDataContent();
        requestContent.Add(new StringContent(json, Encoding.UTF8, "application/json"), "dataModel");
        requestContent.Add(new StringContent("invalid", Encoding.UTF8, "application/xml"), "dddd");

        // Act
        var deserializer = new ModelDeserializer(_logger, typeof(Melding));

        var result = await deserializer.DeserializeAsync(await requestContent.ReadAsStreamAsync(), requestContent.Headers.ContentType!.ToString());

        // Assert
        result.HasError.Should().BeTrue();
        result.Error.Should().Contain("Second entry in multipart serialization must have name=\"previousValues\"");
    }

    [Fact]
    public async Task TestDeserializeMultipart()
    {
        // Arrange
        string json = @"{""test"":""test""}";
        using var requestContent = new MultipartFormDataContent();
        requestContent.Add(new StringContent(json, Encoding.UTF8, "application/json"), "default");
        requestContent.Add(new StringContent("invalid", Encoding.UTF8, "application/xml"), "dddd");

        // Act
        var deserializer = new ModelDeserializer(_logger, typeof(Melding));

        var result = await deserializer.DeserializeAsync(await requestContent.ReadAsStreamAsync(), requestContent.Headers.ContentType!.ToString());

        // Assert
        result.HasError.Should().BeTrue();
        result.Error.Should().Contain("First entry in multipart serialization must have name=\"dataModel\"");
    }

    [Fact]
    public async Task TestDeserializeMultipart_UnknownContentType()
    {
        // Arrange
        string json = @"{""test"":""test""}";
        using var requestContent = new MultipartFormDataContent();
        requestContent.Add(new StringContent(json, Encoding.UTF8, "application/json"), "default");
        requestContent.Add(new StringContent("invalid", Encoding.UTF8, "application/xml"), "dddd");

        // Act
        var deserializer = new ModelDeserializer(_logger, typeof(Melding));

        var result = await deserializer.DeserializeAsync(await requestContent.ReadAsStreamAsync(), "Unknown Content Type");

        // Assert
        result.HasError.Should().BeTrue();
        result.Error.Should().Contain("Unknown content type Unknown Content Type. Cannot read the data.");
    }
}