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
        private readonly IGiteaClient _giteaClient;
        private readonly IHttpContextAccessor _httpContextAccessor;

        /// <summary>
        /// Constructor
        /// </summary>
        /// <param name="giteaClient">IGiteaClient</param>
        /// <param name="httpContextAccessor">IHttpContextAccessor</param>
        public GiteaPushPermissionHandler(
            IGiteaClient giteaClient,
            IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
            _giteaClient = giteaClient;
        }

        /// <inheritdoc/>
        protected override async Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            GiteaPushPermissionRequirement requirement)
        {
            if (_httpContextAccessor.HttpContext == null)
            {
                return;
            }

            string org = _httpContextAccessor.HttpContext.GetRouteValue("org")?.ToString();
            string app = _httpContextAccessor.HttpContext.GetRouteValue("app")?.ToString();

            if (string.IsNullOrWhiteSpace(org) ||
                string.IsNullOrWhiteSpace(app))
            {
                _httpContextAccessor.HttpContext.Response.StatusCode = (int)HttpStatusCode.BadRequest;
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
                _httpContextAccessor.HttpContext.Response.StatusCode = (int)HttpStatusCode.Forbidden;
            }
        }
    }
}
