#nullable disable
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace Altinn.Studio.Designer.Infrastructure.Authorization
{
    /// <summary>
    /// Authorization Handler for GiteaPushPermissionRequirement
    /// </summary>
    public class GiteaPushPermissionHandler : AuthorizationHandler<GiteaPushPermissionRequirement>
    {
        private readonly IGitea _giteaClient;
        private readonly HttpContext _httpContext;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaClient">IGitea</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        public GiteaPushPermissionHandler(
            IGitea giteaClient,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpContext = httpContextAccessor.HttpContext;
            _giteaClient = giteaClient;
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

            RepositoryClient.Model.Repository repository = await _giteaClient.GetRepository(org, app);
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
