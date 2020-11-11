using System;
using System.Threading.Tasks;

using Altinn.App.Services.Configuration;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.Extensions.Options;

namespace Altinn.App.Api.Filters
{
    /// <summary>
    /// Represents a class that can perform request forgery checking.
    /// </summary>
    public class ValidateAntiforgeryTokenIfAuthCookieAuthorizationFilter : IAsyncAuthorizationFilter, IAntiforgeryPolicy
    {
        private readonly IAntiforgery _antiforgery;
        private readonly AppSettings _settings;

        /// <summary>
        /// Initialize a new instance of the <see cref="ValidateAntiforgeryTokenIfAuthCookieAuthorizationFilter"/> class.
        /// </summary>
        /// <param name="antiforgery">An accessor to the antiforgery system.</param>
        /// <param name="settings">A reference to the current app settings.</param>
        public ValidateAntiforgeryTokenIfAuthCookieAuthorizationFilter(
            IAntiforgery antiforgery,
            IOptionsMonitor<AppSettings> settings)
        {
            if (antiforgery == null)
            {
                throw new ArgumentNullException(nameof(antiforgery));
            }

            _antiforgery = antiforgery;
            _settings = settings.CurrentValue;
        }

        /// <inheritdoc />
        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            if (!context.IsEffectivePolicy<IAntiforgeryPolicy>(this))
            {
                return;
            }

            if (ShouldValidate(context))
            {
                try
                {
                    await _antiforgery.ValidateRequestAsync(context.HttpContext);
                }
                catch (AntiforgeryValidationException)
                {
                    context.Result = new AntiforgeryValidationFailedResult();
                }
            }
        }

        /// <summary>
        /// Method that evaluate if validation is required.
        /// </summary>
        /// <param name="context">The <see cref="AuthorizationFilterContext"/>.</param>
        /// <returns>True if validation is needed.</returns>
        protected virtual bool ShouldValidate(AuthorizationFilterContext context)
        {
            if (context == null)
            {
                throw new ArgumentNullException(nameof(context));
            }

            string method = context.HttpContext.Request.Method;
            if (string.Equals("GET", method, StringComparison.OrdinalIgnoreCase) ||
                string.Equals("HEAD", method, StringComparison.OrdinalIgnoreCase) ||
                string.Equals("TRACE", method, StringComparison.OrdinalIgnoreCase) ||
                string.Equals("OPTIONS", method, StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            string authCookie = context.HttpContext.Request.Cookies[Services.Constants.General.RuntimeCookieName];
            if (authCookie == null)
            {
                return false;
            }

            if (_settings.DisableCsrfCheck)
            {
                return false;
            }

            // Anything else requires a token.
            return true;
        }
    }
}
