using Microsoft.AspNetCore.Mvc.Rendering;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;

namespace LocalTest.Models
{
    public class StartAppModel
    {
        /// <summary>
        /// Path to TestData form localPlatformSettings
        /// </summary>
        public string StaticTestDataPath { get; set; }

        /// <summary>
        /// Signals that no TestUsers could be found in TestData
        /// </summary>
        public bool InvalidTestDataPath { get; set; }

        /// <summary>
        /// HttpRequestException that might have resultet from _localApp.GetApplications()
        /// </summary>
        public HttpRequestException HttpException { get; set; }

        /// <summary>
        /// Selected User and party separated by "."
        /// </summary>
        public string UserSelect { get; set; }

        /// <summary>
        /// The userId part of <see cref="UserSelect" />
        /// </summary>
        public int UserId => int.TryParse(UserSelect?.Split(".").First(), out int result) ? result : 0;

        /// <summary>
        /// The partyId part of <see cref="UserSelect" />
        /// </summary>
        public int PartyId => int.TryParse(UserSelect?.Split(".").Last(), out int result) ? result : 0;

        /// <summary>
        /// Path for the selected app
        /// </summary>
        public string AppPathSelection { get; set; }

        /// <summary>
        /// Authentication level for the test user
        /// </summary>
        public string AuthenticationLevel { get; set; }

        /// <summary>
        /// Url to redirect to after localtest has created authentication cookies.
        /// </summary>
        public string RedirectUrl { get; set; }

        /// <summary>
        /// Url for where to load the local frontend from
        /// (implemented as a cookie consumed by localtest proxy middleware)
        /// </summary>
        public string LocalFrontendUrl { get; set; }

        /// <summary>
        /// Human-readable description of the configured frontend source.
        /// </summary>
        public string LocalFrontendDescription { get; set; }

        /// <summary>
        /// List of TestUsers for dropdown
        /// </summary>
        public IEnumerable<SelectListItem> TestUsers { get; set; }

        /// <summary>
        /// List of selectable Apps for dropdown
        /// </summary>
        public List<SelectListItem> TestApps { get; set; }

        /// <summary>
        /// List of possible authentication levels
        /// </summary>
        public IEnumerable<SelectListItem> AuthenticationLevels { get; set; }

        public void SelectRedirectApp()
        {
            var appId = GetAppIdFromRedirectUrl();
            if (string.IsNullOrEmpty(appId))
            {
                return;
            }

            var selectedApp = TestApps.FirstOrDefault(
                app => string.Equals(app.Text, appId, StringComparison.OrdinalIgnoreCase)
            );
            if (selectedApp == null)
            {
                return;
            }

            selectedApp.Selected = true;
            AppPathSelection = selectedApp.Value;
        }

        private string GetAppIdFromRedirectUrl()
        {
            if (string.IsNullOrWhiteSpace(RedirectUrl) || !Uri.TryCreate(RedirectUrl, UriKind.Absolute, out var uri))
            {
                return null;
            }

            var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (segments.Length < 2)
            {
                return null;
            }

            return $"{segments[0]}/{segments[1]}";
        }
    }
}
