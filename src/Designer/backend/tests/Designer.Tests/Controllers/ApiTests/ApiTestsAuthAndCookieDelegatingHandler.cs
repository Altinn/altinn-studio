using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Designer.Tests.Helpers;
using Designer.Tests.Utils;

namespace Designer.Tests.Controllers.ApiTests;

/// <summary>
/// Used for authorize httpclient and to add xsrfToken as a cookie for tests.
/// </summary>
[ExcludeFromCodeCoverage]
internal class ApiTestsAuthAndCookieDelegatingHandler : DelegatingHandler
{
    private readonly string _baseAddress;

    public ApiTestsAuthAndCookieDelegatingHandler() : this("http://localhost")
    {
    }

    public ApiTestsAuthAndCookieDelegatingHandler(string baseAddress)
    {
        _baseAddress = baseAddress;
    }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (request.Headers.TryGetValues("X-XSRF-TOKEN", out IEnumerable<string> _))
        {
            return await base.SendAsync(request, cancellationToken);
        }

        string xsrfUrl = $"{_baseAddress}/designer/api/user/current";
        using var httpRequestMessageXsrf = new HttpRequestMessage(HttpMethod.Get, xsrfUrl);

        using var xsrfResponse = await base.SendAsync(httpRequestMessageXsrf, cancellationToken);
        xsrfResponse.EnsureSuccessStatusCode();

        string xsrfToken = AuthenticationUtil.GetXsrfTokenFromCookie(xsrfResponse.Headers.GetValues(Microsoft.Net.Http.Headers.HeaderNames.SetCookie));
        request.AddXsrfToken(xsrfToken);

        return await base.SendAsync(request, cancellationToken);
    }
}
