using System.Reflection;

namespace Altinn.App.Api.Tests.Extensions;

public static class HttpClientExtensions
{
    public static T? GetDelegatingHandler<T>(this HttpClient httpClient)
        where T : class
    {
        ArgumentNullException.ThrowIfNull(httpClient);

        var internalHandlerField = typeof(HttpMessageInvoker).GetField(
            "_handler",
            BindingFlags.NonPublic | BindingFlags.Instance
        );

        Assert.NotNull(internalHandlerField);

        var delegatingHandler = internalHandlerField.GetValue(httpClient) as DelegatingHandler;
        while (delegatingHandler is not null)
        {
            if (delegatingHandler.GetType() == typeof(T))
            {
                return delegatingHandler as T;
            }
            delegatingHandler = delegatingHandler.InnerHandler as DelegatingHandler;
        }

        return null;
    }

    public static bool ContainsDelegatingHandler<T>(this HttpClient httpClient)
        where T : DelegatingHandler
    {
        return httpClient.GetDelegatingHandler<T>() is not null;
    }
}
