namespace WorkflowEngine.Commands.Extensions;

public static class HttpResponseMessageExtensions
{
    extension(HttpResponseMessage response)
    {
        public async Task<string> GetContentOrDefault(
            string defaultValue,
            CancellationToken cancellationToken = default
        )
        {
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            return string.IsNullOrEmpty(content) ? defaultValue : content;
        }
    }
}
