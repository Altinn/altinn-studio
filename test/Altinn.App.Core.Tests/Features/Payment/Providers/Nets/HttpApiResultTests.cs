using System.Net;
using Altinn.App.Core.Features.Payment.Processors.Nets.Models;

namespace Altinn.App.Core.Tests.Features.Payment.Providers.Nets;

public class HttpApiResultTests
{
    [Fact]
    public async Task FromHttpResponse_ReturnsSuccessResult_WhenStatusCodeIsOk()
    {
        // Arrange
        using var mockResponse = new HttpResponseMessage(HttpStatusCode.OK);
        mockResponse.Content = new StringContent("{\"property\": \"value\"}");

        // Act
        HttpApiResult<object> result = await HttpApiResult<object>.FromHttpResponse(mockResponse);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Result);
        Assert.Equal(HttpStatusCode.OK, result.Status);
    }

    [Fact]
    public async Task FromHttpResponse_ReturnsNoContentResult_WhenStatusCodeIsNoContent()
    {
        // Arrange
        using var mockResponse = new HttpResponseMessage(HttpStatusCode.NoContent);

        // Act
        HttpApiResult<object> result = await HttpApiResult<object>.FromHttpResponse(mockResponse);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Null(result.Result);
        Assert.Equal(HttpStatusCode.NoContent, result.Status);
    }

    [Fact]
    public async Task FromHttpResponse_ReturnsErrorResult_WhenStatusCodeIsError()
    {
        // Arrange
        using var mockResponse = new HttpResponseMessage(HttpStatusCode.InternalServerError);
        mockResponse.Content = new StringContent("Internal Server Error");

        // Act
        HttpApiResult<object> result = await HttpApiResult<object>.FromHttpResponse(mockResponse);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Null(result.Result);
        Assert.Equal(HttpStatusCode.InternalServerError, result.Status);
        Assert.Equal("Internal Server Error", result.RawError);
    }

    [Fact]
    public async Task FromHttpResponse_ReturnsErrorResult_WhenJsonDeserializationFails()
    {
        // Arrange
        using var mockResponse = new HttpResponseMessage(HttpStatusCode.OK);
        mockResponse.Content = new StringContent("Invalid Json");

        // Act
        HttpApiResult<object> result = await HttpApiResult<object>.FromHttpResponse(mockResponse);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Null(result.Result);
        Assert.Equal(HttpStatusCode.OK, result.Status);
        Assert.NotNull(result.RawError);
    }
}
