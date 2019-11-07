using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Moq;
using System;
using System.Reflection.Metadata;
using System.Security.Claims;
using System.Threading.Tasks;
using Xunit;

namespace Altinn.Common.PEP.Authorization
{
    public class AppAccessHandlerTest 
    {
        private readonly Mock<IHttpContextAccessor> _httpContextAccessorMock;
        private readonly Mock<IAuthorization> _authorizationMock;
        private readonly AppAccessHandler _aah;

        public AppAccessHandlerTest()
        {
            _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            _authorizationMock = new Mock<IAuthorization>();
            _aah = new AppAccessHandler(_httpContextAccessorMock.Object, _authorizationMock.Object);
        }

        /// <summary>
        /// Test case: Send request and get respons
        /// Expected: HandleRequirementAsync will not fail
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC01Async()
        {
            // Arrange 
            // create the requirement
            var requirement = new AppAccessRequirement("read");

            // create the user
            var user = new ClaimsPrincipal(
                new ClaimsIdentity(
                    // no claims added
                    ));

            // create the resource
            var resource = new Document
            {
                // set any properties here
            };

            // create the context
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );

            // Mock http
            RouteData routeData = new RouteData();
            routeData.Values.Add("org", "myOrg");
            routeData.Values.Add("app", "myApp");
            HttpContext httpContext = new DefaultHttpContext();
            httpContext.Request.Path = new PathString("/decision?org=org&app=app");
            
            //httpContext.Setup(h => h.GetRouteData()).Returns(routeData);
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            RouteData routedata2 = _httpContextAccessorMock.Object.HttpContext.GetRouteData();

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
        }
    }
}
