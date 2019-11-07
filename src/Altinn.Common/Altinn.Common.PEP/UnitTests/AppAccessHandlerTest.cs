using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Authorization;
using Altinn.Common.PEP.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Moq;
using System;
using System.Collections.Generic;
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
        /// Test case: Send request and get response that fulfills all requirements
        /// Expected: context will succeed
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC01Async()
        {
            // Arrange 
            // create the requirement
            var requirement = new AppAccessRequirement("read");

            // create the user
            List<Claim> claims = new List<Claim>();
            // type, value, valuetupe, issuer
            claims.Add(new Claim("name", "Ola", "string", "org"));

            var user = new ClaimsPrincipal(
                new ClaimsIdentity(
                        claims
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
            HttpContext httpContext = new DefaultHttpContext();
            httpContext.Request.RouteValues.Add("org", "myOrg");
            httpContext.Request.RouteValues.Add("app", "myApp");
            httpContext.Request.RouteValues.Add("instanceGuid", "asdfg");
            httpContext.Request.RouteValues.Add("InstanceOwnerId", "1000");
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Mock authorization
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult result = new XacmlJsonResult();
            result.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(result);
            _authorizationMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.True(context.HasSucceeded);
            Assert.False(context.HasFailed);
        }

        /// <summary>
        /// Test case: Send request and get respons with result deny
        /// Expected: context will fail
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC02Async()
        {
            // Arrange 
            // create the requirement
            var requirement = new AppAccessRequirement("read");

            // create the user
            List<Claim> claims = new List<Claim>();
            // type, value, valuetupe, issuer
            claims.Add(new Claim("name", "Ola", "string", "org"));

            var user = new ClaimsPrincipal(
                new ClaimsIdentity(
                        claims
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
            HttpContext httpContext = new DefaultHttpContext();
            httpContext.Request.RouteValues.Add("org", "myOrg");
            httpContext.Request.RouteValues.Add("app", "myApp");
            httpContext.Request.RouteValues.Add("instanceGuid", "asdfg");
            httpContext.Request.RouteValues.Add("InstanceOwnerId", "1000");
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Mock authorization
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            XacmlJsonResult result = new XacmlJsonResult();
            result.Decision = XacmlContextDecision.Deny.ToString();
            response.Response.Add(result);
            _authorizationMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
            Assert.True(context.HasFailed);
        }
    }
}
