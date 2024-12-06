using System;
using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Designer.Tests.Helpers;
using Designer.Tests.Utils;

namespace Designer.Tests.Fixtures
{

    /// <summary>
    /// Authenticates to Designer using OIDC flow with Gitea as the identity provider.
    /// Attaches the necessary cookies and XSRF token to the request.
    ///
    /// </summary>
    [ExcludeFromCodeCoverage]
    internal class GiteaAuthDelegatingHandler : DelegatingHandler
    {
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var response = await base.SendAsync(request, cancellationToken);
            if (response.StatusCode != HttpStatusCode.Redirect)
            {
                return response;
            }

            return await LoginAndRetryRequest(request, response, cancellationToken);

        }


        private async Task<HttpResponseMessage> LoginAndRetryRequest(HttpRequestMessage request, HttpResponseMessage initialResponse,
            CancellationToken cancellationToken)
        {
            using var redirectToAuthorizeRequest =
                new HttpRequestMessage(HttpMethod.Get, initialResponse.Headers.Location);
            using var redirectToAuthorizeResponse =
                await base.SendAsync(redirectToAuthorizeRequest, cancellationToken);

            using var authorizeRedirectedToLoginResponse =
                await Redirect(redirectToAuthorizeResponse.Headers.Location, cancellationToken);

            using HttpResponseMessage loginToGiteaResponse = await LoginToGitea(authorizeRedirectedToLoginResponse,
                redirectToAuthorizeResponse, cancellationToken);

            using HttpResponseMessage loginToAuthorizeRedirectedResponse = await Redirect(
                loginToGiteaResponse.Headers.Location, cancellationToken, loginToGiteaResponse.GetGiteaAuthCookies());
            var designerSignInUrl = loginToAuthorizeRedirectedResponse.Headers.Location;

            if (loginToAuthorizeRedirectedResponse.StatusCode == HttpStatusCode.OK)
            {
                using HttpResponseMessage grantResponse = await GrantAuthorization(loginToAuthorizeRedirectedResponse,
                    loginToGiteaResponse, cancellationToken);
                designerSignInUrl = grantResponse.Headers.Location;
            }

            using HttpResponseMessage designerSignInResponse =
                await Redirect(designerSignInUrl, cancellationToken, initialResponse.GetCookies(".AspNetCore."));
            var designerAuthCookies = designerSignInResponse.GetCookies("AltinnStudioDesigner");

            string xsrfToken =
                await CallUserCurrentEndpointAndExtractAntiForgeryToken(designerAuthCookies, cancellationToken);

            return await RetryInitialRequestAfterSigningIn(request, designerAuthCookies, xsrfToken, cancellationToken);
        }

        private async Task<HttpResponseMessage> RetryInitialRequestAfterSigningIn(HttpRequestMessage request,
            IEnumerable<string> authCookies, string xsrfToken, CancellationToken cancellationToken)
        {
            using var finalRedirectRequest = new HttpRequestMessage(request.Method, request.RequestUri);
            finalRedirectRequest.Content = request.Content;

            finalRedirectRequest.AddCookies(authCookies);
            finalRedirectRequest.AddXsrfToken(xsrfToken);

            return await base.SendAsync(finalRedirectRequest, cancellationToken);
        }

        private async Task<string> CallUserCurrentEndpointAndExtractAntiForgeryToken(IEnumerable<string> cookies,
            CancellationToken cancellationToken)
        {
            string xsrfUrl = $"{TestUrlsProvider.Instance.DesignerUrl}/designer/api/user/current";
            using var httpRequestMessageXsrf = new HttpRequestMessage(HttpMethod.Get, xsrfUrl);
            httpRequestMessageXsrf.AddCookies(cookies);
            using var xsrfResponse = await base.SendAsync(httpRequestMessageXsrf, cancellationToken);
            string xsrfToken = AuthenticationUtil.GetXsrfTokenFromCookie(xsrfResponse.GetCookies());
            return xsrfToken;
        }

        private async Task<HttpResponseMessage> GrantAuthorization(
            HttpResponseMessage loginToAuthorizeRedirectedResponse,
            HttpResponseMessage loginToGiteaResponse, CancellationToken cancellationToken)
        {
            string authorizePageContent =
                await loginToAuthorizeRedirectedResponse.Content.ReadAsStringAsync(cancellationToken);

            List<KeyValuePair<string, string>> grantFormValues = new()
            {
                new KeyValuePair<string, string>("_csrf",
                    WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent,
                        "<input type=\"hidden\" name=\"_csrf\" value=\"", "\"")),
                new KeyValuePair<string, string>("client_id",
                    WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent,
                        "<input type=\"hidden\" name=\"client_id\" value=\"", "\"")),
                new KeyValuePair<string, string>("state",
                    WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent,
                        "<input type=\"hidden\" name=\"state\" value=\"", "\"")),
                new KeyValuePair<string, string>("scope",
                    WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent,
                        "<input type=\"hidden\" name=\"scope\" value=\"", "\"")),
                new KeyValuePair<string, string>("nonce",
                    WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent,
                        "<input type=\"hidden\" name=\"nonce\" value=\"", "\"")),
                new KeyValuePair<string, string>("redirect_uri",
                    WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent,
                        "<input type=\"hidden\" name=\"redirect_uri\" value=\"", "\"")),
                new KeyValuePair<string, string>("granted", "true"),
            };

            using FormUrlEncodedContent grantContent = new(grantFormValues);

            string grantUrl =
                WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent, "<form method=\"post\" action=\"",
                    "\">");
            using var grantRequest =
                new HttpRequestMessage(HttpMethod.Post, TestUrlsProvider.Instance.GiteaUrl + grantUrl)
                {
                    Content = grantContent
                };

            grantRequest.AddCookies(loginToGiteaResponse.GetGiteaAuthCookies());

            var grantResponse = await base.SendAsync(grantRequest, cancellationToken);
            return grantResponse;
        }

        private async Task<HttpResponseMessage> LoginToGitea(HttpResponseMessage loginRedirectResponse,
            HttpResponseMessage redirectResponse, CancellationToken cancellationToken)
        {
            string loginPageContent = await loginRedirectResponse.Content.ReadAsStringAsync(cancellationToken);


            List<KeyValuePair<string, string>> loginFormValues = new()
            {
                new KeyValuePair<string, string>("user_name", GiteaConstants.TestUser),
                new KeyValuePair<string, string>("password", GiteaConstants.TestUserPassword),
                new KeyValuePair<string, string>("_csrf",
                    WebScrapingUtils.ExtractTextBetweenMarkers(loginPageContent,
                        "<input type=\"hidden\" name=\"_csrf\" value=\"", "\"")),
            };

            using FormUrlEncodedContent content = new(loginFormValues);

            using var giteaPostLoginMessage =
                new HttpRequestMessage(HttpMethod.Post, loginRedirectResponse.RequestMessage.RequestUri)
                {
                    Content = content
                };

            giteaPostLoginMessage.AddCookies(loginRedirectResponse.GetGiteaAuthCookies()
                .Union(redirectResponse.GetCookies("redirect_to")));

            var loginResponse = await base.SendAsync(giteaPostLoginMessage, cancellationToken);
            return loginResponse;
        }


        private async Task<HttpResponseMessage> Redirect(Uri redirectUri, CancellationToken cancellationToken,
            IEnumerable<string> cookies = null)
        {
            var redirectUrl = redirectUri.IsAbsoluteUri
                ? redirectUri
                : new Uri(TestUrlsProvider.Instance.GiteaUrl + redirectUri);
            using var redirectRequest = new HttpRequestMessage(HttpMethod.Get, redirectUrl);
            if (cookies != null)
            {
                redirectRequest.AddCookies(cookies);
            }

            return await base.SendAsync(redirectRequest, cancellationToken);
        }
    }
}
