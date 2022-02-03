using System;
using System.Collections.Generic;
using System.Security.Claims;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using AltinnCore.Authentication.Constants;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace Designer.Tests.Services
{
    public class SourceControlLoggingDecoratorTests : IClassFixture<WebApplicationFactory<Startup>>
    {
        private WebApplicationFactory<Startup> _webApplicationFactory;
        private ITestOutputHelper _outputHelper;

        public SourceControlLoggingDecoratorTests(WebApplicationFactory<Startup> webApplicationFactory, ITestOutputHelper outputHelper)
        {
            _webApplicationFactory = webApplicationFactory;
            _outputHelper = outputHelper;
        }

        [Fact]
        public void DecoratedISourceControlService_EnforceExceptionFromImplementation_LogsErrorWithAdditionalInfo()
        {
            // Since the system under test is a logging decorator class, we
            // want to make sure it actually logs and that it doesn't crash
            // while collecting additional information to put in the logs.
            var loggerMock = new Mock<ILogger<SourceControlLoggingDecorator>>();
            loggerMock
                .Setup(l => l.Log(
                    It.Is<LogLevel>(l => l == LogLevel.Error),
                    It.IsAny<EventId>(),
                    It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Failed executing method")),
                    It.IsAny<Exception>(),
                    It.Is<Func<It.IsAnyType, Exception, string>>((v, t) => true)))
                .Verifiable();
                
            var loggerFactoryMock = new Mock<ILoggerFactory>();
            loggerFactoryMock.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(loggerMock.Object);
            var serviceProvider = GetServiceProvider(loggerFactoryMock);
            var service = serviceProvider.GetService<ISourceControl>();

            Action action = () => service.Status("org_should_not_exists", "repo_should_not_exists");

            action.Should().Throw<LibGit2Sharp.RepositoryNotFoundException>();
            loggerMock.Verify();
        }

        [Fact]
        public void Container_DecoratesISourceControlService_ReturnsDecoratorClass()
        {
            var loggerMock = new Mock<ILogger<SourceControlLoggingDecorator>>();
            var loggerFactoryMock = new Mock<ILoggerFactory>();
            loggerFactoryMock.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(loggerMock.Object);
            var serviceProvider = GetServiceProvider(loggerFactoryMock);

            var service = serviceProvider.GetService<ISourceControl>();

            service.Should().BeOfType<SourceControlLoggingDecorator>();
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
