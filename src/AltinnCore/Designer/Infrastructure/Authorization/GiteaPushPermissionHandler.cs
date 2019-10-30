using System.Net;
using System.Threading.Tasks;
using AltinnCore.Common.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.Logging;

namespace AltinnCore.Designer.Infrastructure.Authorization
{
    /// <summary>
    /// Authorization Handler for GiteaPushPermissionRequirement
    /// </summary>
    public class GiteaPushPermissionHandler : AuthorizationHandler<GiteaPushPermissionRequirement>
    {
        private readonly IGitea _giteaApiWrapper;
        private readonly HttpContext _httpContext;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaApiWrapper">IGitea</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        public GiteaPushPermissionHandler(
            IGitea giteaApiWrapper,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpContext = httpContextAccessor.HttpContext;
            _giteaApiWrapper = giteaApiWrapper;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            GiteaPushPermissionRequirement requirement)
        {
            if (_httpContext == null)
            {
                return;
            }

            string org = _httpContext.GetRouteValue("org")?.ToString();
            string app = _httpContext.GetRouteValue("app")?.ToString();

            if (string.IsNullOrWhiteSpace(org) ||
                string.IsNullOrWhiteSpace(app))
            {
                _httpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                return;
            }

            RepositoryClient.Model.Repository repository = await _giteaApiWrapper.GetRepository(org, app);
            if (repository?.Permissions?.Push == true ||
                repository?.Permissions?.Admin == true)
            {
                context.Succeed(requirement);
            }
            else
            {
                _httpContext.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            }
        }
    }
}
