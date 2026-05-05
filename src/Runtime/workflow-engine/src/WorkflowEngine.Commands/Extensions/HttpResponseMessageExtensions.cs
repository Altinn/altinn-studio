namespace WorkflowEngine.Commands.Extensions;

/// <summary>
/// Helpers over <see cref="HttpResponseMessage"/> used by command handlers when interpreting upstream responses.
/// </summary>
public static class HttpResponseMessageExtensions
{
    extension(HttpResponseMessage response)
    {
        /// <summary>
        /// Reads the response body as a string, falling back to <paramref name="defaultValue"/> when the body is empty.
        /// </summary>
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
