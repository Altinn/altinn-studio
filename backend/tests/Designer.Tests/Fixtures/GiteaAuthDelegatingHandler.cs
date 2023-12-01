using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Designer.Tests.Utils;

namespace Designer.Tests.Fixtures
{

    /// <summary>
    /// Used for authorize httpclient and to add xsrfToken as a cookie for tests.
    /// Logic for setting cookie is ported from <see cref="AuthenticationUtil"/>
    /// </summary>
    [ExcludeFromCodeCoverage]
    internal class GiteaAuthDelegatingHandler : DelegatingHandler
    {
        private readonly string _giteaBaseAddress;
        private readonly string _baseAddress;

        public GiteaAuthDelegatingHandler(string giteaBaseAddress) : this(giteaBaseAddress, "http://localhost")
        {
        }

        public GiteaAuthDelegatingHandler(string giteaBaseAddress, string baseAddress)
        {
            _giteaBaseAddress = giteaBaseAddress;
            _baseAddress = baseAddress;
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {

            using HttpResponseMessage authorizedGiteaResponse = await GetAuthorizedGiteaResponse(cancellationToken);
            return await LoginToDesignerAndProxyRequest(authorizedGiteaResponse, request, cancellationToken);
        }

        private async Task<HttpResponseMessage> GetAuthorizedGiteaResponse(CancellationToken cancellationToken)
        {
            string giteaLoginUrl = $"{_giteaBaseAddress}user/login";
            using var giteaClient = new HttpClient(new HttpClientHandler
            {
                AllowAutoRedirect = false
            });

            using var giteaGetLoginResponse = await giteaClient.GetAsync(giteaLoginUrl, cancellationToken);
            string htmlContent = await giteaGetLoginResponse.Content.ReadAsStringAsync(cancellationToken);
            List<KeyValuePair<string, string>> formValues = new()
            {
                new KeyValuePair<string, string>("user_name", GiteaConstants.TestUser),
                new KeyValuePair<string, string>("password", GiteaConstants.TestUserPassword),
                new KeyValuePair<string, string>("_csrf", GetStringFromHtmlContent(htmlContent, "<input type=\"hidden\" name=\"_csrf\" value=\"", "\"")),
            };

            using FormUrlEncodedContent content = new(formValues);

            using var giteaPostLoginMessage = new HttpRequestMessage(HttpMethod.Post, giteaLoginUrl)
            {
                Content = content
            };

            giteaPostLoginMessage.Headers.Add("Cookie", GetGiteaAuthCookiesFromResponseMessage(giteaGetLoginResponse));

            return await giteaClient.SendAsync(giteaPostLoginMessage, cancellationToken);
        }

        private async Task<HttpResponseMessage> LoginToDesignerAndProxyRequest(HttpResponseMessage giteaAuthorizedResponse, HttpRequestMessage request, CancellationToken cancellationToken)
        {
            string loginUrl = $"{_baseAddress}/Login";
            using var httpRequestMessageLogin = new HttpRequestMessage(HttpMethod.Get, loginUrl);
            SetCookies(httpRequestMessageLogin, GetGiteaAuthCookiesFromResponseMessage(giteaAuthorizedResponse));

            using var loginResponse = await base.SendAsync(httpRequestMessageLogin, cancellationToken);

            string xsrfUrl = $"{_baseAddress}/designer/api/user/current";
            using var httpRequestMessageXsrf = new HttpRequestMessage(HttpMethod.Get, xsrfUrl);
            SetCookies(httpRequestMessageXsrf, GetGiteaAuthCookiesFromResponseMessage(loginResponse));

            IEnumerable<string> cookies = null;
            if (loginResponse.Headers.Contains("Set-Cookie"))
            {
                cookies = loginResponse.Headers.GetValues("Set-Cookie");
                AuthenticationUtil.SetAltinnStudioCookieFromResponseHeader(httpRequestMessageXsrf, cookies);
            }

            var xsrfResponse = await base.SendAsync(httpRequestMessageXsrf, cancellationToken);

            var xsrfcookies = xsrfResponse.Headers.GetValues("Set-Cookie");
            string xsrfToken = AuthenticationUtil.GetXsrfTokenFromCookie(xsrfcookies);
            AuthenticationUtil.SetAltinnStudioCookieFromResponseHeader(request, cookies, xsrfToken);
            SetCookies(request, GetGiteaAuthCookiesFromResponseMessage(xsrfResponse));

            return await base.SendAsync(request, cancellationToken);
        }

        private static string GetStringFromHtmlContent(string htmlContent, string inputSearchTextBefore, string inputSearchTextAfter)
        {
            int start = htmlContent.IndexOf(inputSearchTextBefore, StringComparison.InvariantCulture);

            // Add the lengt of the search string to find the start place for form vlaue
            start += inputSearchTextBefore.Length;

            // Find the end of the input value content in html (input element with " as end)
            int stop = htmlContent.IndexOf(inputSearchTextAfter, start, StringComparison.InvariantCulture);

            if (start > 0 && stop > 0 && stop > start)
            {
                string formValue = htmlContent.Substring(start, stop - start);
                return formValue;
            }

            return null;
        }

        private static IEnumerable<string> GetGiteaAuthCookiesFromResponseMessage(HttpResponseMessage responseMessage)
        {
            if (responseMessage.Headers.Contains("Set-Cookie"))
            {
                return responseMessage.Headers.GetValues("Set-Cookie").Where(x => x.Contains("i_like_gitea") || x.Contains("_flash")).ToList();
            }

            throw new ArgumentException("Response message does not contain any cookies");
        }

        private static void SetCookies(HttpRequestMessage message, IEnumerable<string> cookies)
        {
            foreach (string cookie in cookies)
            {
                message.Headers.Add("Cookie", cookie);
            }
        }
    }
}
