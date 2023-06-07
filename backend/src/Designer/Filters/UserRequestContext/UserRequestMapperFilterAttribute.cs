using Altinn.Studio.Designer.Helpers;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Altinn.Studio.Designer.Filters.UserRequestContext
{
    public class UserRequestMapperFilterAttribute : ActionFilterAttribute
    {
        private readonly IUserRequestContext _userRequestContext;
        
        public UserRequestMapperFilterAttribute(IUserRequestContext userRequestContext)
        {
            _userRequestContext = userRequestContext;
        }

        public override void OnActionExecuting(ActionExecutingContext context)
        {
            base.OnActionExecuting(context);
            var httpRequest = context.HttpContext.Request;

            object org = httpRequest.RouteValues["org"];
            object repo = httpRequest.RouteValues["repo"] ?? httpRequest.RouteValues["repository"] ?? httpRequest.RouteValues["app"];
            string developer = AuthenticationHelper.GetDeveloperUserName(httpRequest.HttpContext);

            _userRequestContext.Org = org?.ToString();
            _userRequestContext.Repo = repo?.ToString();
            _userRequestContext.Developer = developer;
        }
    }
}
