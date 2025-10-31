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
        /// The name of the app
        /// </summary>
        public string App { get; set; }

        /// <summary>
        /// The name of the org
        /// </summary>
        public string Org { get; set; }

        /// <summary>
        /// Defines if a app has defined invalid path
        /// </summary>
        public bool InvalidAppPath { get; set; }

        /// <summary>
        /// Title of the app
        /// </summary>
        public string AppTitle { get; set; }

        /// <summary>
        /// _localPlatformSettings.AppRepositoryBasePath
        /// </summary>
        public string AppPath { get; set; }

        /// <summary>
        /// Path to TestData form localPlatformSettings
        /// </summary>
        public string StaticTestDataPath { get; set; }

        /// <summary>
        /// Signals that no TestUsers could be found in TestData
        /// </summary>
        public bool InvalidTestDataPath { get; set; }

        /// <summary>
        /// LocalAppUrl from localPlatformSettings
        /// </summary>
        public string LocalAppUrl { get; set; }

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
        /// Url for where to load the local frontend from
        /// (implemented as a cookie that nginx reads and substitutes the content in index.html)
        /// </summary>
        public string LocalFrontendUrl { get; set; }

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

        /// <summary>
        /// The current app mode (e.g., "http", "file", "auto")
        /// </summary>
        public string AppMode { get; set; }
    }
}
