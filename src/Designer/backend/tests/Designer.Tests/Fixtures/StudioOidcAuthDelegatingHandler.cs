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
    /// Authenticates to Designer using OIDC flow with fake-ansattporten as the identity provider.
    /// StudioOidc returns 401 for non-/Login paths, so this handler detects 401 and initiates login manually.
    /// </summary>
    [ExcludeFromCodeCoverage]
    internal class StudioOidcAuthDelegatingHandler : DelegatingHandler
    {
        private readonly StudioOidcGiteaFixture _fixture;
        private List<string> _cachedAuthCookies = [];
        private string _cachedXsrfToken;

        public StudioOidcAuthDelegatingHandler(StudioOidcGiteaFixture fixture)
        {
            _fixture = fixture;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            // Add cached auth cookies to every request (Secure cookies aren't sent by CookieContainer over HTTP)
            if (_cachedAuthCookies.Count > 0)
            {
                request.AddCookies(_cachedAuthCookies);
                request.AddXsrfToken(_cachedXsrfToken);
            }

            var response = await base.SendAsync(request, cancellationToken);

            // Update cached cookies if server re-issued them (e.g., after token refresh)
            var updatedAuthCookies = response.GetCookies("AltinnStudioDesigner");
            if (updatedAuthCookies.Any())
            {
                _cachedAuthCookies = updatedAuthCookies.ToList();
            }

            if (response.StatusCode != HttpStatusCode.Unauthorized)
            {
                return response;
            }

            return await LoginAndRetryRequest(request, cancellationToken);
        }

        private async Task<HttpResponseMessage> LoginAndRetryRequest(
            HttpRequestMessage request,
            CancellationToken cancellationToken
        )
        {
            // Step 1: GET /Login to trigger OIDC redirect to fake-ansattporten
            string loginUrl = $"{_fixture.DesignerUrl}/Login";
            using var loginRequest = new HttpRequestMessage(HttpMethod.Get, loginUrl);
            using var loginResponse = await base.SendAsync(loginRequest, cancellationToken);

            if (loginResponse.StatusCode != HttpStatusCode.Redirect)
            {
                throw new Exception($"Expected redirect from /Login, got {loginResponse.StatusCode}");
            }

            var correlationCookies = loginResponse.GetCookies(".AspNetCore.").ToList();

            // Step 2: GET fake-ansattporten /authorize -> returns HTML user picker
            using var authorizeRequest = new HttpRequestMessage(HttpMethod.Get, loginResponse.Headers.Location);
            using var authorizeResponse = await base.SendAsync(authorizeRequest, cancellationToken);

            string authorizePageContent = await authorizeResponse.Content.ReadAsStringAsync(cancellationToken);

            // Step 3: POST fake-ansattporten /authorize with user selection
            string redirectUri = WebScrapingUtils.ExtractTextBetweenMarkers(
                authorizePageContent,
                "name=\"redirect_uri\" value=\"",
                "\""
            );
            string state = WebScrapingUtils.ExtractTextBetweenMarkers(
                authorizePageContent,
                "name=\"state\" value=\"",
                "\""
            );
            string nonce = WebScrapingUtils.ExtractTextBetweenMarkers(
                authorizePageContent,
                "name=\"nonce\" value=\"",
                "\""
            );

            var userSelectFormValues = new List<KeyValuePair<string, string>>
            {
                new("redirect_uri", redirectUri),
                new("state", state),
                new("nonce", nonce),
                new("user", StudioOidcGiteaFixture.TestUserPid),
            };

            using var userSelectContent = new FormUrlEncodedContent(userSelectFormValues);
            string authorizePostUrl =
                authorizeResponse.RequestMessage?.RequestUri?.GetLeftPart(UriPartial.Authority)
                ?? _fixture.FakeAnsattportenUrl;
            using var userSelectRequest = new HttpRequestMessage(HttpMethod.Post, $"{authorizePostUrl}/authorize")
            {
                Content = userSelectContent,
            };

            using var userSelectResponse = await base.SendAsync(userSelectRequest, cancellationToken);

            if (userSelectResponse.StatusCode != HttpStatusCode.Found)
            {
                throw new Exception($"Expected redirect from fake-ansattporten, got {userSelectResponse.StatusCode}");
            }

            // Step 4: Follow redirect back to Designer's OIDC callback (studio-oidc-signin)
            var callbackUri = userSelectResponse.Headers.Location;
            using var callbackRequest = new HttpRequestMessage(HttpMethod.Get, callbackUri);
            callbackRequest.AddCookies(correlationCookies);

            using var callbackResponse = await base.SendAsync(callbackRequest, cancellationToken);

            // The callback should redirect to studio-oidc/callback which signs in and redirects
            var currentResponse = callbackResponse;
            var authCookies = new List<string>();
            int maxRedirects = 10;
            int redirectCount = 0;

            while (currentResponse.StatusCode == HttpStatusCode.Redirect && redirectCount < maxRedirects)
            {
                redirectCount++;
                var newCookies = currentResponse.GetCookies();
                authCookies.AddRange(newCookies);

                var nextUri = currentResponse.Headers.Location;
                if (!nextUri.IsAbsoluteUri)
                {
                    nextUri = new Uri(new Uri(_fixture.DesignerUrl), nextUri);
                }

                var nextRequest = new HttpRequestMessage(HttpMethod.Get, nextUri);
                nextRequest.AddCookies(correlationCookies);
                nextRequest.AddCookies(authCookies.Where(c => c.Contains("AltinnStudioDesigner")));

                var nextResponse = await base.SendAsync(nextRequest, cancellationToken);
                currentResponse = nextResponse;
            }

            // Collect final auth cookies
            authCookies.AddRange(currentResponse.GetCookies());
            var designerAuthCookies = authCookies.Where(c => c.Contains("AltinnStudioDesigner")).ToList();

            string xsrfToken = await CallUserCurrentEndpointAndExtractAntiForgeryToken(
                designerAuthCookies,
                cancellationToken
            );

            // Cache auth cookies so they're added to subsequent requests
            _cachedAuthCookies = designerAuthCookies;
            _cachedXsrfToken = xsrfToken;

            return await RetryInitialRequestAfterSigningIn(request, designerAuthCookies, xsrfToken, cancellationToken);
        }

        private async Task<HttpResponseMessage> RetryInitialRequestAfterSigningIn(
            HttpRequestMessage request,
            IEnumerable<string> authCookies,
            string xsrfToken,
            CancellationToken cancellationToken
        )
        {
            using var finalRequest = new HttpRequestMessage(request.Method, request.RequestUri);
            finalRequest.Content = request.Content;

            finalRequest.AddCookies(authCookies);
            finalRequest.AddXsrfToken(xsrfToken);

            return await base.SendAsync(finalRequest, cancellationToken);
        }

        private async Task<string> CallUserCurrentEndpointAndExtractAntiForgeryToken(
            IEnumerable<string> cookies,
            CancellationToken cancellationToken
        )
        {
            string xsrfUrl = $"{_fixture.DesignerUrl}/designer/api/user/current";
            using var httpRequestMessageXsrf = new HttpRequestMessage(HttpMethod.Get, xsrfUrl);
            httpRequestMessageXsrf.AddCookies(cookies);
            using var xsrfResponse = await base.SendAsync(httpRequestMessageXsrf, cancellationToken);
            string xsrfToken = AuthenticationUtil.GetXsrfTokenFromCookie(xsrfResponse.GetCookies());
            return xsrfToken;
        }
    }
}
