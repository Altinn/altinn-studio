#nullable disable
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

/// <summary>
/// Adds the GitOps bot token to the request header.
/// </summary>
public class GitOpsBotTokenDelegatingHandler(GitOpsSettings gitOpsSettings) : DelegatingHandler
{

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(gitOpsSettings.BotPersonalAccessToken))
        {
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("token", gitOpsSettings.BotPersonalAccessToken);
        }

        return await base.SendAsync(request, cancellationToken);
    }
}
