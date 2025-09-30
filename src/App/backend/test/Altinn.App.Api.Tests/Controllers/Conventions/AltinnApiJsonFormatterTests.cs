using System.Text.Encodings.Web;
using System.Text.Json.Serialization.Metadata;
using Altinn.App.Api.Controllers.Attributes;
using Altinn.App.Api.Controllers.Conventions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Formatters;

namespace Altinn.App.Api.Tests.Controllers.Conventions;

public class AltinnApiJsonFormatterTests
{
    [Fact]
    public void CreateFormatter_WhenEncoderIsNotNull_PreservesEncoder()
    {
        // Arrange
        string settingsName = JsonSettingNames.AltinnApi;
        var originalEncoder = JavaScriptEncoder.Default;

        var jsonOptions = new JsonOptions();
        jsonOptions.JsonSerializerOptions.Encoder = originalEncoder;
        jsonOptions.JsonSerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver();

        // Act
        var formatter = AltinnApiJsonFormatter.CreateFormatter(settingsName, jsonOptions);

        // Assert
        Assert.NotNull(formatter);
        Assert.Equal(settingsName, formatter.SettingsName);
        Assert.Equal(originalEncoder, formatter.SerializerOptions.Encoder);
    }

    [Fact]
    public void CanWriteResult_SettingsNameMatches_ReturnsTrue()
    {
        // Arrange
        string settingsName = JsonSettingNames.AltinnApi;

        var jsonOptions = new JsonOptions();
        jsonOptions.JsonSerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver();

        var formatter = AltinnApiJsonFormatter.CreateFormatter(settingsName, jsonOptions);

        var httpContext = new DefaultHttpContext();

        // Create an Endpoint with JsonSettingsNameAttribute
        var endpoint = new Endpoint(
            requestDelegate: null,
            metadata: new EndpointMetadataCollection(new JsonSettingsNameAttribute(settingsName)),
            displayName: null
        );

        httpContext.SetEndpoint(endpoint);

        var context = new OutputFormatterWriteContext(
            httpContext,
            (stream, encoding) => new StreamWriter(stream, encoding),
            typeof(object),
            new object()
        );

        // Act
        bool canWrite = formatter.CanWriteResult(context);

        // Assert
        Assert.True(canWrite);
    }

    [Fact]
    public void CanWriteResult_SettingsNameMisMatch_ReturnsFalse()
    {
        // Arrange
        string formatterSettingsName = "FormatterSettingName";
        string endpointSettingsName = "EndpointSettingName";

        var jsonOptions = new JsonOptions();
        jsonOptions.JsonSerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver();

        var formatter = AltinnApiJsonFormatter.CreateFormatter(formatterSettingsName, jsonOptions);

        var httpContext = new DefaultHttpContext();

        // Create an Endpoint with JsonSettingsNameAttribute with a different name
        var endpoint = new Endpoint(
            requestDelegate: null,
            metadata: new EndpointMetadataCollection(new JsonSettingsNameAttribute(endpointSettingsName)),
            displayName: null
        );

        httpContext.SetEndpoint(endpoint);

        var context = new OutputFormatterWriteContext(
            httpContext,
            (stream, encoding) => new StreamWriter(stream, encoding),
            typeof(object),
            new object()
        );

        // Act
        bool canWrite = formatter.CanWriteResult(context);

        // Assert
        Assert.False(canWrite);
    }
}
