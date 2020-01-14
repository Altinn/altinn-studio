using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace AltinnCore.UnitTest.Helpers
{
    /// <summary>
    /// Helper for controller context
    /// </summary>
    public static class ControllerContextHelper
    {
        /// <summary>
        /// Method that returns controller context with Gitea SessionID
        /// </summary>
        /// <param name="giteaSession">The session ID for the test</param>
        /// <param name="addServiceProvider">Defines if the authentication service providers needs to be added</param>
        /// <returns>Controller Context</returns>
        public static ControllerContext GetControllerContextWithValidGiteaSession(string giteaSession, bool addServiceProvider = false)
        {
            DefaultHttpContext httpContext = new DefaultHttpContext();
            if (addServiceProvider)
            {
                Mock<IServiceProvider> serviceProviderMock = GetServiceProviderMock();
                httpContext = new DefaultHttpContext() { RequestServices = serviceProviderMock.Object };
            }

            var cookies = new[] { "i_like_gitea=" + giteaSession };

            httpContext.Request.Headers["Cookie"] = cookies;
            ControllerContext controllerContext = new ControllerContext()
            {
                HttpContext = httpContext,
            };

            return controllerContext;
        }

        /// <summary>
        /// Add authentication service provider
        /// See https://stackoverflow.com/questions/48873454/no-service-for-type-microsoft-aspnetcore-mvc-has-been-registered
        /// For problems it can cause.
        /// </summary>
        /// <returns>The Mock service provider</returns>
        private static Mock<IServiceProvider> GetServiceProviderMock()
        {
            Mock<IAuthenticationService> authServiceMock = new Mock<IAuthenticationService>();
            authServiceMock
                .Setup(_ => _.SignInAsync(It.IsAny<HttpContext>(), It.IsAny<string>(), It.IsAny<ClaimsPrincipal>(), It.IsAny<AuthenticationProperties>()))
                .Returns(Task.FromResult((object)null));

            authServiceMock
            .Setup(_ => _.SignOutAsync(It.IsAny<HttpContext>(), It.IsAny<string>(), It.IsAny<AuthenticationProperties>()))
            .Returns(Task.FromResult((object)null));

            Mock<IServiceProvider> serviceProviderMock = new Mock<IServiceProvider>();
            serviceProviderMock
                .Setup(_ => _.GetService(typeof(IAuthenticationService)))
                .Returns(authServiceMock.Object);

            return serviceProviderMock;
        }
    }
}
