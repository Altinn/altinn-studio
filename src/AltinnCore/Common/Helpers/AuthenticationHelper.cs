using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using AltinnCore.Common.Constants;
using Microsoft.AspNetCore.Http;

namespace AltinnCore.Common.Helpers
{
    /// <summary>
    /// helper class for authentication
    /// </summary>
    public static class AuthenticationHelper
    {
        /// <summary>
        /// Gets the service developer's user name
        /// </summary>
        /// <param name="context">the http context</param>
        /// <returns>The developer user name</returns>
        public static string GetDeveloperUserName(HttpContext context)
        {
            string userName = null;

            if (context.User != null)
            {
                foreach (Claim claim in context.User.Claims)
                {
                    if (claim.Type.Equals(AltinnCoreClaimTypes.Developer))
                    {
                        userName = claim.Value;
                    }
                }
            }

            return userName;
        }

        /// <summary>
        /// Gets the Developer App token from cookie
        /// </summary>
        /// <param name="context">The Http Context</param>
        /// <returns>The developer app token</returns>
        public static string GetDeveloperAppToken(HttpContext context)
        {
            string accessToken = null;

            if (context.User != null)
            {
                foreach (Claim claim in context.User.Claims)
                {
                    if (claim.Type.Equals(AltinnCoreClaimTypes.DeveloperToken))
                    {
                        accessToken = claim.Value;
                    }
                }
            }

            return accessToken;
        }

        /// <summary>
        /// Gets the Developer App token id from cookie
        /// </summary>
        /// <param name="context">The Http Context</param>
        /// <returns>The developer app token</returns>
        public static string GetDeveloperAppTokenId(HttpContext context)
        {
            string accessTokenId = null;

            if (context.User != null)
            {
                foreach (Claim claim in context.User.Claims)
                {
                    if (claim.Type.Equals(AltinnCoreClaimTypes.DeveloperTokenId))
                    {
                        accessTokenId = claim.Value;
                    }
                }
            }

            return accessTokenId;
        }

        /// <summary>
        /// Returns the designer cookie 
        /// </summary>
        /// <param name="context">Httpcontext with request</param>
        /// <param name="cookieHost">The cookie host</param>
        /// <returns>The cookie</returns>
        public static Cookie GetDesignerCookie(HttpContext context, string cookieHost)
        {
            return new Cookie(AltinnCore.Common.Constants.General.DesignerCookieName, context.Request.Cookies[AltinnCore.Common.Constants.General.DesignerCookieName], "/", cookieHost);
        }

        /// <summary>
        /// Builds the header value for use against GITEA API
        /// Requires a special format.
        /// </summary>
        /// <param name="context">The http context</param>
        /// <returns>A header value string</returns>
        public static string GetDeveloperTokenHeaderValue(HttpContext context)
        {
            return "token " + AuthenticationHelper.GetDeveloperAppToken(context);
        }

        /// <summary>
        /// Gets the gitea session for the given session id
        /// </summary>
        /// <param name="context">the http context</param>
        /// <param name="sessionCookieId">the session cookie id</param>
        /// <returns>The gitea session</returns>
        public static string GetGiteaSession(HttpContext context, string sessionCookieId)
         {
            if (context.Request.Cookies != null && context.Request.Cookies.ContainsKey(sessionCookieId))
            {
                return context.Request.Cookies[sessionCookieId];
            }

            return null;
        }

        /// <summary>
        /// Creates a HttpClient with necessary cookies to call the designer APIS from runtime.
        /// </summary>
        /// <param name="context">The http context</param>
        /// <param name="cookieHost">The cookie host for the designer cookie</param>
        /// <returns>a new Http Client</returns>
        public static HttpClient GetDesignerHttpClient(HttpContext context, string cookieHost)
        {
            Cookie cookie = GetDesignerCookie(context, cookieHost);

            CookieContainer cookieContainer = new CookieContainer();
            cookieContainer.Add(cookie);
            HttpClientHandler handler = new HttpClientHandler() { CookieContainer = cookieContainer };

            return new HttpClient(handler);
        }
    }
}
