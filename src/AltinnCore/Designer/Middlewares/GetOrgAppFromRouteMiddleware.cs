using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;

namespace AltinnCore.Designer.Middlewares
{
    /// <summary>
    /// a
    /// </summary>
    public class GetOrgAppFromRouteMiddleware
    {
        private readonly RequestDelegate _next;

        /// <summary>
        /// TODO: add comment
        /// </summary>
        /// <param name="next">add comment</param>
        public GetOrgAppFromRouteMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        /// <summary>
        /// TODO: add comment
        /// </summary>
        /// <param name="context">add comment</param>
        public async Task InvokeAsync(HttpContext context)
        {
            const string routeOrg = "org";
            const string routeApp = "app";
            context.Items[routeOrg] = context.GetRouteValue(routeOrg).ToString();
            context.Items[routeApp] = context.GetRouteValue(routeApp).ToString();

            await _next(context);
        }
    }
}
