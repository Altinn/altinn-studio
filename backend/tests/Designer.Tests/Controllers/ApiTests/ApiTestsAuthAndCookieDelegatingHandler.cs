using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Designer.Tests.Utils;
using static Designer.Tests.Utils.AuthenticationUtil;

namespace Designer.Tests.Controllers.ApiTests;

/// <summary>
/// Used for authorize httpclient and to add xsrfToken as a cookie for tests.
/// Logic for setting cookie is ported from <see cref="AuthenticationUtil"/>
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
        var loginUrl = $"{_baseAddress}/Login";
        var httpRequestMessageLogin = new HttpRequestMessage(HttpMethod.Get, loginUrl);

        var loginResponse = await base.SendAsync(httpRequestMessageLogin, cancellationToken);

        var xsrfUrl = $"{_baseAddress}/designer/api/v1/user/current";
        var httpRequestMessageXsrf = new HttpRequestMessage(HttpMethod.Get, xsrfUrl);

        IEnumerable<string> cookies = null;
        if (loginResponse.Headers.Contains("Set-Cookie"))
        {
            cookies = loginResponse.Headers.GetValues("Set-Cookie");
            SetAltinnStudiCookieFromResponseHeader(httpRequestMessageXsrf, cookies);
        }

        var xsrfResponse = await base.SendAsync(httpRequestMessageXsrf, cancellationToken);

        var xsrfcookies = xsrfResponse.Headers.GetValues("Set-Cookie");
        var xsrfToken = GetXsrfTokenFromCookie(xsrfcookies);
        SetAltinnStudiCookieFromResponseHeader(request, cookies, xsrfToken);

        return await base.SendAsync(request, cancellationToken);
    }
}
