using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using AltinnCore.Authentication.Constants;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Services
{
    public class SourceControlLoggingDecoratorTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private WebApplicationFactory<Startup> _webApplicationFactory;

        public SourceControlLoggingDecoratorTests(WebApplicationFactory<Startup> webApplicationFactory)
        {
            _webApplicationFactory = webApplicationFactory;
        }

        [Fact]
        public void Container_AskForISourceControl_ReturnsSourceControLogingDecorator()
        {
            var loggerMock = new Mock<ILogger<SourceControlLoggingDecorator>>();
            loggerMock.Setup(l => l.Log<object>(It.IsAny<LogLevel>(), It.IsAny<EventId>(), It.IsAny<object>(), It.IsAny<Exception>(), It.IsAny<Func<object, Exception, string>>())).Verifiable();
            var loggerFactoryMock = new Mock<ILoggerFactory>();
            loggerFactoryMock.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(loggerMock.Object);
            var serviceProvider = GetServiceProvider(loggerFactoryMock);

            var service = serviceProvider.GetService<ISourceControl>();
            
            service.Should().BeOfType<SourceControlLoggingDecorator>();
            Assert.Throws<LibGit2Sharp.RepositoryNotFoundException>(() => service.Status("test", "repo"));
            loggerMock.Verify();
        }

        public IServiceProvider GetServiceProvider(Mock<ILoggerFactory> loggerFactoryMock)
        {
            HttpContext httpContext = GetHttpContextForTestUser("testUser");

            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(httpContext);

            return _webApplicationFactory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    services.AddSingleton<ILoggerFactory>(loggerFactoryMock.Object);
                    services.AddSingleton<IHttpContextAccessor>(httpContextAccessorMock.Object);
                });
            }).Services;
        }

        private static HttpContext GetHttpContextForTestUser(string userName)
        {
            var claims = new List<Claim>();
            claims.Add(new Claim(AltinnCoreClaimTypes.Developer, userName, ClaimValueTypes.String, "altinn.no"));
            ClaimsIdentity identity = new ClaimsIdentity("TestUserLogin");
            identity.AddClaims(claims);

            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            HttpContext c = new DefaultHttpContext();
            c.Request.HttpContext.User = principal;
            c.Request.RouteValues.Add("org", "ttd");
            c.Request.RouteValues.Add("app", "apps-test-tba");

            return c;
        }
    }
}
