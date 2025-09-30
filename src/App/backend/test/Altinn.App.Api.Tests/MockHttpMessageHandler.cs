using Microsoft.Extensions.Logging;

namespace Altinn.App.Api.Tests;

public class MockHttpMessageHandler(
    Func<HttpRequestMessage, Task<HttpResponseMessage>> sendAsyncHandler,
    ILogger<MockHttpMessageHandler> logger
) : HttpMessageHandler
{
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        if (request.Content is not null)
        {
            await request.Content.LoadIntoBufferAsync();

            logger.LogInformation(
                "MockHttpMessageHandler.SendAsync called with request: {url}\n{content}",
                request.RequestUri,
                await request.Content.ReadAsStringAsync(cancellationToken)
            );
        }
        else
        {
            logger.LogInformation("MockHttpMessageHandler.SendAsync called with request: {url}", request.RequestUri);
        }
        var response = await sendAsyncHandler(request);

        await response.Content.LoadIntoBufferAsync();
        logger.LogInformation(
            "MockHttpMessageHandler.SendAsync returning response: {statusCode}\n{content}",
            response.StatusCode,
            await response.Content.ReadAsStringAsync(cancellationToken)
        );

        return response;
    }
}
