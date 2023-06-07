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

            string org = httpRequest.RouteValues["org"]?.ToString();
            object repo = httpRequest.RouteValues["repo"]?.ToString() ?? httpRequest.RouteValues["repository"]?.ToString() ?? httpRequest.RouteValues["app"]?.ToString();
            string developer = AuthenticationHelper.GetDeveloperUserName(httpRequest.HttpContext);

            PropertySetterUtils.SetValue(_userRequestContext, nameof(_userRequestContext.Org), org);
            PropertySetterUtils.SetValue(_userRequestContext, nameof(_userRequestContext.Repo), repo);
            PropertySetterUtils.SetValue(_userRequestContext, nameof(_userRequestContext.Developer), developer);
        }
    }
}
