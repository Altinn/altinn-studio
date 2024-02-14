using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;

namespace Designer.Tests.Hubs.Auth;

public class HubAuthDelegatingHandler : DelegatingHandler
{
    private readonly HttpClient _authorizedDesignerClient;

    public HubAuthDelegatingHandler(HttpClient authorizedDesignerClient)
    {
        _authorizedDesignerClient = authorizedDesignerClient;
    }


    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var authorizedResponse = await _authorizedDesignerClient.GetAsync("/designer/api/user/current", cancellationToken);
        authorizedResponse.EnsureSuccessStatusCode();
        // add cookies to request
        var cookies = authorizedResponse!.RequestMessage!.Headers.GetValues("Cookie");
        foreach (string cookie in cookies)
        {
            request.Headers.Add("Cookie", cookie);
        }
        return await base.SendAsync(request, cancellationToken);
    }

}
