using System.Collections.Generic;
using System.Diagnostics.CodeAnalysis;
using System.Linq;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Designer.Tests.Helpers;
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
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var response = await base.SendAsync(request, cancellationToken);

            var redirectResponse = await base.SendAsync(new HttpRequestMessage(HttpMethod.Get, response.Headers.Location), cancellationToken);

            var loginRedirectResponse = await base.SendAsync(new HttpRequestMessage(HttpMethod.Get, "http://studio.localhost" + redirectResponse.Headers.Location), cancellationToken);

            var loginPageContent = await loginRedirectResponse.Content.ReadAsStringAsync(cancellationToken);


            List<KeyValuePair<string, string>> loginFormValues = new()
            {
                new KeyValuePair<string, string>("user_name", GiteaConstants.TestUser),
                new KeyValuePair<string, string>("password", GiteaConstants.TestUserPassword),
                new KeyValuePair<string, string>("_csrf", WebScrapingUtils.ExtractTextBetweenMarkers(loginPageContent, "<input type=\"hidden\" name=\"_csrf\" value=\"", "\"")),
            };

            using FormUrlEncodedContent content = new(loginFormValues);

            using var giteaPostLoginMessage = new HttpRequestMessage(HttpMethod.Post, loginRedirectResponse.RequestMessage.RequestUri)
            {
                Content = content
            };

            giteaPostLoginMessage.AddCookies(loginRedirectResponse.GetGiteaAuthCookies().Union(redirectResponse.GetCookies("redirect_to")));

            var loginResponse = await base.SendAsync(giteaPostLoginMessage, cancellationToken);


            var authorizeRequest = new HttpRequestMessage(HttpMethod.Get,"http://studio.localhost" + loginResponse.Headers.Location);
            authorizeRequest.AddCookies(loginResponse.GetGiteaAuthCookies());
            var autorizeRedirectResponse = await base.SendAsync(authorizeRequest, cancellationToken);
            string authorizePageContent = await autorizeRedirectResponse.Content.ReadAsStringAsync(cancellationToken);

            List<KeyValuePair<string, string>> grantFormValues = new()
            {

                new KeyValuePair<string, string>("_csrf",WebScrapingUtils. ExtractTextBetweenMarkers(authorizePageContent, "<input type=\"hidden\" name=\"_csrf\" value=\"", "\"")),
                new KeyValuePair<string, string>("client_id", WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent, "<input type=\"hidden\" name=\"client_id\" value=\"", "\"")),
                new KeyValuePair<string, string>("state", WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent, "<input type=\"hidden\" name=\"state\" value=\"", "\"")),
                new KeyValuePair<string, string>("scope", WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent, "<input type=\"hidden\" name=\"scope\" value=\"", "\"")),
                new KeyValuePair<string, string>("nonce", WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent, "<input type=\"hidden\" name=\"nonce\" value=\"", "\"")),
                new KeyValuePair<string, string>("redirect_uri", WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent, "<input type=\"hidden\" name=\"redirect_uri\" value=\"", "\"")),
            };

            using FormUrlEncodedContent grantContent = new(grantFormValues);

            string grantUrl = WebScrapingUtils.ExtractTextBetweenMarkers(authorizePageContent, "<form method=\"post\" action=\"", "\">");
            using var grantRequest = new HttpRequestMessage(HttpMethod.Post, "http://studio.localhost" + grantUrl)
            {
                Content = grantContent
            };

            grantRequest.AddCookies(loginResponse.GetGiteaAuthCookies());

            var grantResponse = await base.SendAsync(grantRequest, cancellationToken);


            var designerSignInRequeset = new HttpRequestMessage(HttpMethod.Get, grantResponse.Headers.Location);

            // add cookies from response that contain ".AspNetCore."
            designerSignInRequeset.AddCookies(response.GetCookies(".AspNetCore."));

            var designerSignInResponse = await base.SendAsync(designerSignInRequeset, cancellationToken);

            var finalRedirectRequest = new HttpRequestMessage(request.Method, "http://studio.localhost" + designerSignInResponse.Headers.Location)
            {
                Content = request.Content
            };


            // Call the /designer/api/user/current and extract the XSRF-TOKEN but attach cookies that contain "AltinnStudioDesigner"
            string xsrfUrl = "http://studio.localhost/designer/api/user/current";
            var httpRequestMessageXsrf = new HttpRequestMessage(HttpMethod.Get, xsrfUrl);
            httpRequestMessageXsrf.AddCookies(designerSignInResponse.GetCookies("AltinnStudioDesigner"));
            var xsrfResponse = await base.SendAsync(httpRequestMessageXsrf, cancellationToken);
            string xsrfToken = AuthenticationUtil.GetXsrfTokenFromCookie(xsrfResponse.GetCookies());


            // add cookies from designerSignInResponse that contain "AltinnStudioDesigner"
            finalRedirectRequest.AddCookies(designerSignInResponse.GetCookies("AltinnStudioDesigner"));
            finalRedirectRequest.AddXsrfToken(xsrfToken);

            var finalRedirectResponse = await base.SendAsync(finalRedirectRequest, cancellationToken);
            return finalRedirectResponse;
        }

    }
}
