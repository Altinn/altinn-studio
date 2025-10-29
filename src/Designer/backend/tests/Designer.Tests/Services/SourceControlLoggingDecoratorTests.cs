#nullable disable
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using Xunit.Abstractions;

namespace Designer.Tests.Services
{
    public class SourceControlLoggingDecoratorTests : IClassFixture<WebApplicationFactory<SourceControlLoggingDecorator>>
    {
        private WebApplicationFactory<SourceControlLoggingDecorator> _webApplicationFactory;
        private ITestOutputHelper _outputHelper;

        public SourceControlLoggingDecoratorTests(WebApplicationFactory<SourceControlLoggingDecorator> webApplicationFactory, ITestOutputHelper outputHelper)
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

            Assert.IsType<SourceControlLoggingDecorator>(service);
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
            }

            loggerMock.Verify();
        }

        [Fact]
        public async Task DecoratedISourceControlService_CloneRemoteRepository1_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                await service.CloneRemoteRepository("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
            }

            loggerMock.Verify();
        }

        [Fact]
        public async Task DecoratedISourceControlService_CloneRemoteRepository2_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                await service.CloneRemoteRepository("org_should_not_exists", "repo_should_not_exists", "destination_path_should_not_exists", "branch_name_should_not_exists");
            }
            catch
            {
            }

            loggerMock.Verify();
        }

        [Fact]
        public async Task DecoratedISourceControlService_DeleteRepository_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                await service.DeleteRepository("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
        }

        [Fact]
        public async Task DecoratedISourceControlService_CommitAndPushChanges_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                await service.CommitAndPushChanges("org_should_not_exists", "repo_should_not_exists", "non-existing-branch", "non-existing-file", "should_not_be_commited");
            }
            catch
            {
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
        }

        [Fact]
        public async Task DecoratedISourceControlService_FetchRemoteChanges_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                await service.FetchRemoteChanges("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
        }

        [Fact]
        public async Task DecoratedISourceControlService_PushChangesForRepository_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                await service.PushChangesForRepository(new CommitInfo() { Org = "org_should_not_exists", Repository = "repo_should_not_exists", Message = "should_not_be_commited" });
            }
            catch
            {
            }

            loggerMock.Verify();
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
            }

            loggerMock.Verify();
        }

        [Fact]
        public async Task DecoratedISourceControlService_CloneIfNotExists_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                await service.CloneIfNotExists("org_should_not_exists", "repo_should_not_exists");
            }
            catch
            {
            }

            loggerMock.Verify();
        }

        [Fact]
        public void DecoratedISourceControlService_StoreAppTokenForUser_LogsErrorWithAdditionalInfo()
        {
            (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();

            try
            {
                service.StoreAppTokenForUser("some_random_token");
            }
            catch
            {
            }

            loggerMock.Verify();
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
            HttpContext httpContext = new DefaultHttpContext();

            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(httpContext);
            Environment.SetEnvironmentVariable("OidcLoginSettings__ClientId", "test");
            Environment.SetEnvironmentVariable("OidcLoginSettings__ClientSecret", "test");

            var services = _webApplicationFactory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureTestServices(services =>
                {
                    services.AddSingleton<ILoggerFactory>(loggerFactoryMock.Object);
                    services.AddSingleton<IHttpContextAccessor>(httpContextAccessorMock.Object);
                    services.AddTransient<ISourceControl, SourceControlStub>();
                    services.Decorate<ISourceControl, SourceControlLoggingDecorator>();
                });
            }).Services;

            // Create a scope to obtain a reference to a scoped service provider
            return services.CreateScope().ServiceProvider;
        }
    }

    public class SourceControlStub : ISourceControl
    {
        public int? CheckRemoteUpdates(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<string> CloneRemoteRepository(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<string> CloneRemoteRepository(string org, string repository, string destinationPath, string branchName = "")
        {
            throw new NotImplementedException();
        }

        public void Commit(CommitInfo commitInfo)
        {
            throw new NotImplementedException();
        }

        public Task CommitAndPushChanges(string org, string repository, string branchName, string localPath, string message, string accessToken = "")
        {
            throw new NotImplementedException();
        }

        public Task<Branch> CreateBranch(string org, string repository, string branchName)
        {
            throw new NotImplementedException();
        }

        public Task<bool> CreatePullRequest(string org, string repository, string target, string source, string title)
        {
            throw new NotImplementedException();
        }

        public Task DeleteRepository(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName)
        {
            throw new NotImplementedException();
        }

        public void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message)
        {
            throw new NotImplementedException();
        }

        public void RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext)
        {
            throw new NotImplementedException();
        }

        public void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName)
        {
            throw new NotImplementedException();
        }

        public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null)
        {
            throw new NotImplementedException();
        }

        public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch)
        {
            throw new NotImplementedException();
        }

        public Task FetchRemoteChanges(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public string GetAppToken()
        {
            throw new NotImplementedException();
        }

        public string GetAppTokenId()
        {
            throw new NotImplementedException();
        }

        public Task<string> GetDeployToken()
        {
            throw new NotImplementedException();
        }

        public Commit GetLatestCommitForCurrentUser(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public bool IsLocalRepo(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public List<Commit> Log(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<RepoStatus> PullRemoteChanges(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<Dictionary<string, string>> GetChangedContent(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task<bool> Push(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public Task PushChangesForRepository(CommitInfo commitInfo)
        {
            throw new NotImplementedException();
        }

        public RepoStatus RepositoryStatus(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public void StageChange(string org, string repository, string fileName)
        {
            throw new NotImplementedException();
        }

        public List<RepositoryContent> Status(string org, string repository)
        {
            throw new NotImplementedException();
        }

        public void StoreAppTokenForUser(string token)
        {
            throw new NotImplementedException();
        }

        public Task CloneIfNotExists(string org, string repository)
        {
            throw new NotImplementedException();
        }
    }
}
