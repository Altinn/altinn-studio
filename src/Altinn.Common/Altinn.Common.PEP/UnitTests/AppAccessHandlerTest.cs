using Altinn.Authorization.ABAC.Xacml;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Common.PEP.Configuration;
using Altinn.Common.PEP.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Moq;
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
        private readonly Mock<IPDP> _pdpMock;
        private readonly IOptions<GeneralSettings> _generalSettings;
        private readonly AppAccessHandler _aah;

        public AppAccessHandlerTest()
        {
            _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            _pdpMock = new Mock<IPDP>();
            _generalSettings = Options.Create(new GeneralSettings());
            _generalSettings.Value.DisablePEP = false;
            _aah = new AppAccessHandler(_httpContextAccessorMock.Object, _pdpMock.Object, _generalSettings);
        }

        /// <summary>
        /// Test case: Send request and get response that fulfills all requirements
        /// Expected: Context will succeed
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC01Async()
        {
            // Arrange 
            AppAccessRequirement requirement = new AppAccessRequirement("read");
            ClaimsPrincipal user = CreateUser();
            Document resource = new Document();
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );
            HttpContext httpContext = CreateHttpContext();
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Create response 
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            // Set result to premit
            XacmlJsonResult result = new XacmlJsonResult();
            result.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(result);
            _pdpMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.True(context.HasSucceeded);
            Assert.False(context.HasFailed);
        }

        /// <summary>
        /// Test case: Send request and get respons with result deny
        /// Expected: Context will fail
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC02Async()
        {
            // Arrange 
            AppAccessRequirement requirement = new AppAccessRequirement("read");
            ClaimsPrincipal user = CreateUser();
            Document resource = new Document();
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );
            HttpContext httpContext = CreateHttpContext();
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Create response 
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            // Add result and set decision to deny
            XacmlJsonResult result = new XacmlJsonResult();
            result.Decision = XacmlContextDecision.Deny.ToString();
            response.Response.Add(result);
            _pdpMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
            Assert.True(context.HasFailed);
        }

        /// <summary>
        /// Test case: Send request and get respons with two results
        /// Expected: Context will fail
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC03Async()
        {
            // Arrange 
            AppAccessRequirement requirement = new AppAccessRequirement("read");
            ClaimsPrincipal user = CreateUser();
            Document resource = new Document();
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );
            HttpContext httpContext = CreateHttpContext();
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Create response
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            // Add result and set decision to permit
            XacmlJsonResult result = new XacmlJsonResult();
            result.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(result);
            // Add extra result
            response.Response.Add(new XacmlJsonResult());
            _pdpMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
            Assert.True(context.HasFailed);
        }

        /// <summary>
        /// Test case: Send request and get respons with obligation that contains min authentication level that the user meets
        /// Expected: context will succeed
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC04Async()
        {
            // Arrange 
            AppAccessRequirement requirement = new AppAccessRequirement("read");
            ClaimsPrincipal user = CreateUser();
            Document resource = new Document();
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );
            HttpContext httpContext = CreateHttpContext();
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Create response
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            // Add result and set decision to permit
            XacmlJsonResult result = new XacmlJsonResult();
            result.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(result);
            // Add obligation to result with a minimum authentication level attribute
            XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
            obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel",
                Value = "2"
            };
            obligation.AttributeAssignment.Add(authenticationAttribute);
            result.Obligations = new List<XacmlJsonObligationOrAdvice>();
            result.Obligations.Add(obligation);
            _pdpMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.True(context.HasSucceeded);
            Assert.False(context.HasFailed);
        }

        /// <summary>
        /// Test case: Send request and get respons with obligation that contains min authentication level that the user do not meet
        /// Expected: context will fail
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC05Async()
        {
            // Arrange 
            AppAccessRequirement requirement = new AppAccessRequirement("read");
            ClaimsPrincipal user = CreateUser();
            Document resource = new Document();
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );
            HttpContext httpContext = CreateHttpContext();
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Create response
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = new List<XacmlJsonResult>();
            // Add result and set decision to permit
            XacmlJsonResult result = new XacmlJsonResult();
            result.Decision = XacmlContextDecision.Permit.ToString();
            response.Response.Add(result);
            // Add obligation to result with a minimum authentication level attribute
            XacmlJsonObligationOrAdvice obligation = new XacmlJsonObligationOrAdvice();
            obligation.AttributeAssignment = new List<XacmlJsonAttributeAssignment>();
            XacmlJsonAttributeAssignment authenticationAttribute = new XacmlJsonAttributeAssignment()
            {
                Category = "urn:altinn:minimum-authenticationlevel",
                Value = "3"
            };
            obligation.AttributeAssignment.Add(authenticationAttribute);
            result.Obligations = new List<XacmlJsonObligationOrAdvice>();
            result.Obligations.Add(obligation);
            _pdpMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
            Assert.True(context.HasFailed);
        }

        /// <summary>
        /// Test case: Send request and get response that is null
        /// Expected: Context will fail 
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC06Async()
        {
            // Arrange 
            AppAccessRequirement requirement = new AppAccessRequirement("read");
            ClaimsPrincipal user = CreateUser();
            Document resource = new Document();
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );
            HttpContext httpContext = CreateHttpContext();
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Create response 
            XacmlJsonResponse response = null;
            _pdpMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
            Assert.True(context.HasFailed);
        }

        /// <summary>
        /// Test case: Send request and get response with a result list that is null
        /// Expected: Context will fail 
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC07Async()
        {
            // Arrange 
            AppAccessRequirement requirement = new AppAccessRequirement("read");
            ClaimsPrincipal user = CreateUser();
            Document resource = new Document();
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );
            HttpContext httpContext = CreateHttpContext();
            _httpContextAccessorMock.Setup(h => h.HttpContext).Returns(httpContext);

            // Create response with a result list that is null
            XacmlJsonResponse response = new XacmlJsonResponse();
            response.Response = null;
            _pdpMock.Setup(a => a.GetDecisionForRequest(It.IsAny<XacmlJsonRequest>())).Returns(Task.FromResult(response));

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.False(context.HasSucceeded);
            Assert.True(context.HasFailed);
        }

        /// <summary>
        /// Test case: Send request and get response where disablePEP is true
        /// Expected: Context will succeed
        /// </summary>
        [Fact]
        public async Task HandleRequirementAsync_TC08Async()
        {
            // Arrange
            _generalSettings.Value.DisablePEP = true;
            AppAccessRequirement requirement = new AppAccessRequirement("read");
            ClaimsPrincipal user = CreateUser();
            Document resource = new Document();
            AuthorizationHandlerContext context = new AuthorizationHandlerContext(
                new[] { requirement },
                user,
                resource
                );

            // Act
            await _aah.HandleAsync(context);

            // Assert
            Assert.True(context.HasSucceeded);
            Assert.False(context.HasFailed);
        }

        private ClaimsPrincipal CreateUser()
        {
            // Create the user
            List<Claim> claims = new List<Claim>();

            // type, value, valuetupe, issuer
            claims.Add(new Claim("urn:name", "Ola", "string", "org"));
            claims.Add(new Claim("urn:altinn:minimum-authenticationlevel", "2", "string", "org"));

            ClaimsPrincipal user = new ClaimsPrincipal(
                new ClaimsIdentity(
                        claims
                    ));

            return user;
        }

        private HttpContext CreateHttpContext()
        {
            HttpContext httpContext = new DefaultHttpContext();
            httpContext.Request.RouteValues.Add("org", "myOrg");
            httpContext.Request.RouteValues.Add("app", "myApp");
            httpContext.Request.RouteValues.Add("instanceGuid", "asdfg");
            httpContext.Request.RouteValues.Add("InstanceOwnerId", "1000");

            return httpContext;
        }
    }
}
