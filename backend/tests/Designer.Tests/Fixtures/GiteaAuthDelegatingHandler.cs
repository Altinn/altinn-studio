using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Net;
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
            var response = await base.SendAsync(request, cancellationToken);

            var redirectResponse = await base.SendAsync(new HttpRequestMessage(HttpMethod.Get, response.Headers.Location), cancellationToken);

            var loginRedirectResponse = await base.SendAsync(new HttpRequestMessage(HttpMethod.Get, "http://studio.localhost" + redirectResponse.Headers.Location), cancellationToken);

            var loginPageContent = await loginRedirectResponse.Content.ReadAsStringAsync(cancellationToken);


            var redirectToCookie = redirectResponse.Headers.GetValues("Set-Cookie").Where(x => x.Contains("redirect_to"));

            List<KeyValuePair<string, string>> loginFormValues = new()
            {
                new KeyValuePair<string, string>("user_name", GiteaConstants.TestUser),
                new KeyValuePair<string, string>("password", GiteaConstants.TestUserPassword),
                new KeyValuePair<string, string>("_csrf", GetStringFromHtmlContent(loginPageContent, "<input type=\"hidden\" name=\"_csrf\" value=\"", "\"")),
            };

            using FormUrlEncodedContent content = new(loginFormValues);

            using var giteaPostLoginMessage = new HttpRequestMessage(HttpMethod.Post, loginRedirectResponse.RequestMessage.RequestUri)
            {
                Content = content
            };

            giteaPostLoginMessage.Headers.Add("Cookie", GetGiteaAuthCookiesFromResponseMessage(loginRedirectResponse));
            giteaPostLoginMessage.Headers.Add("Cookie", redirectToCookie);
            var loginResponse = await base.SendAsync(giteaPostLoginMessage, cancellationToken);


            var authorizeRequest = new HttpRequestMessage(HttpMethod.Get,"http://studio.localhost" + loginResponse.Headers.Location);
            authorizeRequest.Headers.Add("Cookie", GetGiteaAuthCookiesFromResponseMessage(loginResponse));
            var autorizeRedirectResponse = await base.SendAsync(authorizeRequest, cancellationToken);
            var authorizePageContent = await autorizeRedirectResponse.Content.ReadAsStringAsync(cancellationToken);

            List<KeyValuePair<string, string>> grantFormValues = new()
            {
                new KeyValuePair<string, string>("_csrf", GetStringFromHtmlContent(authorizePageContent, "<input type=\"hidden\" name=\"_csrf\" value=\"", "\"")),
                new KeyValuePair<string, string>("client_id", GetStringFromHtmlContent(authorizePageContent, "<input type=\"hidden\" name=\"client_id\" value=\"", "\"")),
                new KeyValuePair<string, string>("state", GetStringFromHtmlContent(authorizePageContent, "<input type=\"hidden\" name=\"state\" value=\"", "\"")),
                new KeyValuePair<string, string>("scope", GetStringFromHtmlContent(authorizePageContent, "<input type=\"hidden\" name=\"scope\" value=\"", "\"")),
                new KeyValuePair<string, string>("nonce", GetStringFromHtmlContent(authorizePageContent, "<input type=\"hidden\" name=\"nonce\" value=\"", "\"")),
                new KeyValuePair<string, string>("redirect_uri", GetStringFromHtmlContent(authorizePageContent, "<input type=\"hidden\" name=\"redirect_uri\" value=\"", "\"")),
            };

            using FormUrlEncodedContent grantContent = new(grantFormValues);

            var grantUrl = GetStringFromHtmlContent(authorizePageContent, "<form method=\"post\" action=\"", "\">");
            using var grantRequest = new HttpRequestMessage(HttpMethod.Post, "http://studio.localhost" + grantUrl)
            {
                Content = grantContent
            };

            grantRequest.Headers.Add("Cookie", GetGiteaAuthCookiesFromResponseMessage(loginResponse));
            var grantResponse = await base.SendAsync(grantRequest, cancellationToken);


            var designerSignInRequeset = new HttpRequestMessage(HttpMethod.Get, grantResponse.Headers.Location);

            // add cookies from response that contain ".AspNetCore."
            var cookies = response.Headers.GetValues("Set-Cookie").Where(x => x.Contains(".AspNetCore."));
            foreach (var cookie in cookies)
            {
                designerSignInRequeset.Headers.Add("Cookie", cookie);
            }

            var designerSignInResponse = await base.SendAsync(designerSignInRequeset, cancellationToken);


            var finalRedirectRequest = new HttpRequestMessage(HttpMethod.Get, "http://studio.localhost" + designerSignInResponse.Headers.Location);
            // add cookies from designerSignInResponse that contain "AltinnStudioDesigner"
            var designerCookies = designerSignInResponse.Headers.GetValues("Set-Cookie").Where(x => x.Contains("AltinnStudioDesigner"));
            foreach (var cookie in designerCookies)
            {
                finalRedirectRequest.Headers.Add("Cookie", cookie);
            }

            var finalRedirectResponse = await base.SendAsync(finalRedirectRequest, cancellationToken);
            return finalRedirectResponse;
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

            var xsrfcookies = xsrfResponse.Headers.Contains("Set-Cookie") ? xsrfResponse.Headers.GetValues("Set-Cookie") : xsrfResponse.RequestMessage.Headers.GetValues("Cookie");
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

            if (responseMessage.RequestMessage.Headers.Contains("Cookie"))
            {
                return responseMessage.RequestMessage.Headers.GetValues("Cookie")
                    .Where(x => x.Contains("i_like_gitea") || x.Contains("_flash")).ToList();
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
