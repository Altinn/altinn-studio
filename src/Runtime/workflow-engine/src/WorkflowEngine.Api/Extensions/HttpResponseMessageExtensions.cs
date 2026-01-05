namespace Altinn.App.ProcessEngine.Extensions;

internal static class HttpResponseMessageExtensions
{
    public static async Task<string> GetContentOrDefault(
        this HttpResponseMessage response,
        string defaultValue,
        CancellationToken cancellationToken = default
    )
    {
        var content = await response.Content.ReadAsStringAsync(cancellationToken);
        return string.IsNullOrEmpty(content) ? defaultValue : content;
    }
}
