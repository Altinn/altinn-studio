using System;
using System.Collections.Generic;
using System.Security.Claims;
using Altinn.Studio.Designer;
using Altinn.Studio.Designer.Models;
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
        public void Container_DecoratesISourceControlService_ReturnsDecoratorClass()
        {
            var loggerMock = new Mock<ILogger<SourceControlLoggingDecorator>>();
            var loggerFactoryMock = new Mock<ILoggerFactory>();
            loggerFactoryMock.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(loggerMock.Object);
            var serviceProvider = GetServiceProvider(loggerFactoryMock);

            var service = serviceProvider.GetService<ISourceControl>();

            service.Should().BeOfType<SourceControlLoggingDecorator>();
        }

        [Fact]
        public void DecoratedISourceControlService_Status_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();
                        
            try
            {
                service.Status("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_CloneRemoteRepository_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.CloneRemoteRepository("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_DeleteRepository_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.DeleteRepository("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_StageChange_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.StageChange("org_should_not_exists", "repo_should_not_exists", "file_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_AbortMerge_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.AbortMerge("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_CheckoutLatestCommitForSpecificFile_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.CheckoutLatestCommitForSpecificFile("org_should_not_exists", "repo_should_not_exists", "file_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_CheckRemoteUpdates_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.CheckRemoteUpdates("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_Commit_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.Commit(new CommitInfo() { Org = "org_should_not_exists", Repository = "repo_should_not_exists", Message = "should_not_be_commited" });
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_CommitAndPushChanges_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.CommitAndPushChanges("org_should_not_exists", "repo_should_not_exists", "non-existing-branch", "non-existing-file", "should_not_be_commited");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_CreateBranch_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.CreateBranch("org_should_not_exists", "repo_should_not_exists", "non-existing-branch");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_CreatePullRequest_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.CreatePullRequest("org_should_not_exists", "repo_should_not_exists", "non-existing-target-branch", "non-existing-source-branch", "could-have-been-a-pull-request-title");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_FetchRemoteChanges_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.FetchRemoteChanges("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_GetInitialCommit_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.GetInitialCommit("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_GetLatestCommitForCurrentUser_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.GetLatestCommitForCurrentUser("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_IsLocalRepo_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.IsLocalRepo("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_Log_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.Log("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_PullRemoteChanges_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.PullRemoteChanges("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_Push_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.Push("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_PushChangesForRepository_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.PushChangesForRepository(new CommitInfo() { Org = "org_should_not_exists", Repository = "repo_should_not_exists", Message = "should_not_be_commited" });
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_RepositoryStatus_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.RepositoryStatus("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_ResetCommit_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.ResetCommit("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        [Fact]
        public void DecoratedISourceControlService_VerifyCloneExists_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.VerifyCloneExists("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
                loggerMock.Verify();
            }
        }

        private (ISourceControl Service, Mock<ILogger<SourceControlLoggingDecorator>> LoggerMock) GetService()
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

            return (service, loggerMock);
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
