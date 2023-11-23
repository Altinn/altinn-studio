using System;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Altinn.Studio.Designer.TypedHttpClients.DelegatingHandlers;

public class Custom401Handler : DelegatingHandler
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public Custom401Handler(IHttpContextAccessor httpContextAccessor, HttpClientHandler innerHandler) : base(innerHandler)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        var response = await base.SendAsync(request, cancellationToken);

        if (response.StatusCode == HttpStatusCode.Unauthorized)
        {
            foreach (var cookie in _httpContextAccessor.HttpContext.Request.Cookies.Keys)
            {
                _httpContextAccessor.HttpContext.Response.Cookies.Delete(cookie);
                _httpContextAccessor.HttpContext.Response.StatusCode = 401;
            }
        }

        return response;
    }
}
