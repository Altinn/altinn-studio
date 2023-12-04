using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.TypedHttpClients.Exceptions;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

public class Custom401Handler : DelegatingHandler
{
    public Custom401Handler(HttpClientHandler innerHandler) : base(innerHandler)
    {
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await base.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            response.Dispose();
            throw new GiteaUnathorizedException("Gitea session is invalid");
        }

        return response;
    }
}
