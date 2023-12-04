using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

namespace Designer.Tests.Utils
{
    public static class AuthenticationUtil
    {
        public static async Task AddAuthenticateAndAuthAndXsrFCookieToRequest(HttpClient client, HttpRequestMessage message)
        {
            string loginUrl = $"/Login";
            HttpRequestMessage httpRequestMessageLogin = new HttpRequestMessage(HttpMethod.Get, loginUrl)
            {
            };

            HttpResponseMessage loginResponse = await client.SendAsync(httpRequestMessageLogin);

            string xsrfUrl = $"" +
                             $"designer/api/user/current";
            HttpRequestMessage httpRequestMessageXsrf = new HttpRequestMessage(HttpMethod.Get, xsrfUrl)
            {
            };

            IEnumerable<string> cookies = null;
            if (loginResponse.Headers.Contains("Set-Cookie"))
            {
                cookies = loginResponse.Headers.GetValues("Set-Cookie");
                SetAltinnStudioCookieFromResponseHeader(httpRequestMessageXsrf, cookies);
            }

            HttpResponseMessage xsrfResponse = await client.SendAsync(httpRequestMessageXsrf);

            IEnumerable<string> xsrfcookies = xsrfResponse.Headers.GetValues("Set-Cookie");
            string xsrfToken = GetXsrfTokenFromCookie(xsrfcookies);
            SetAltinnStudioCookieFromResponseHeader(message, cookies, xsrfToken);
        }

        internal static string GetXsrfTokenFromCookie(IEnumerable<string> setCookieHeader)
        {
            foreach (string singleCookieHeader in setCookieHeader)
            {
                string[] cookies = singleCookieHeader.Split(',');

                foreach (string cookie in cookies)
                {
                    string[] cookieSettings = cookie.Split(";");

                    if (cookieSettings[0].StartsWith("XSRF-TOKEN"))
                    {
                        return cookieSettings[0].Replace("XSRF-TOKEN" + "=", string.Empty);
                    }
                }
            }

            return null;
        }

        internal static void SetAltinnStudioCookieFromResponseHeader(HttpRequestMessage requestMessage, IEnumerable<string> setCookieHeader, string xsrfToken = null)
        {
            if (setCookieHeader != null)
            {
                foreach (string singleCookieHeader in setCookieHeader)
                {
                    string[] cookies = singleCookieHeader.Split(',');

                    foreach (string cookie in cookies)
                    {
                        string[] cookieSettings = cookie.Split(";");

                        if (cookieSettings[0].StartsWith(Altinn.Studio.Designer.Constants.General.DesignerCookieName))
                        {
                            AddAuthCookie(requestMessage, cookieSettings[0].Replace(Altinn.Studio.Designer.Constants.General.DesignerCookieName + "=", string.Empty), xsrfToken);
                        }
                    }
                }
            }
            else
            {
                AddAuthCookie(requestMessage, null, xsrfToken);
            }
        }

        private static void AddAuthCookie(HttpRequestMessage requestMessage, string token, string xsrfToken = null)
        {
            if (token != null)
            {
                requestMessage.Headers.Add("Cookie", Altinn.Studio.Designer.Constants.General.DesignerCookieName + "=" + token);
            }

            if (xsrfToken != null)
            {
                requestMessage.Headers.Add("X-XSRF-TOKEN", xsrfToken);
            }
        }
    }
}
