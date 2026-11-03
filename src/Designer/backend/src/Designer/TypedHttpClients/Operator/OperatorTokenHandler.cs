using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Designer.TypedHttpClients.Operator;

/// <summary>
/// Sends the projected ServiceAccount token as a bearer token. The operator checks it with a TokenReview.
/// </summary>
/// <remarks>
/// The kubelet rotates the token before it expires, so the handler reads the file for every request.
/// </remarks>
internal sealed class OperatorTokenHandler(IOptions<OperatorSettings> settings) : DelegatingHandler
{
    /// <inheritdoc />
    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken
    )
    {
        string token = await ReadToken(cancellationToken);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return await base.SendAsync(request, cancellationToken);
    }

    private async Task<string> ReadToken(CancellationToken cancellationToken)
    {
        string path = settings.Value.TokenPath;
        if (!File.Exists(path))
        {
            throw new InvalidOperationException(
                $"The core-operator token file {path} does not exist. Mount a projected ServiceAccount token there."
            );
        }

        string token = (await File.ReadAllTextAsync(path, cancellationToken)).Trim();
        if (token.Length == 0)
        {
            throw new InvalidOperationException($"The core-operator token file {path} is empty.");
        }

        return token;
    }
}
