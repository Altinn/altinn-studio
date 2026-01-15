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

namespace Designer.Tests.Services;

public class SourceControlLoggingDecoratorTests(WebApplicationFactory<SourceControlLoggingDecorator> webApplicationFactory) : IClassFixture<WebApplicationFactory<SourceControlLoggingDecorator>>
{
    private readonly WebApplicationFactory<SourceControlLoggingDecorator> _webApplicationFactory = webApplicationFactory;

    [Fact]
    public void Container_DecoratesISourceControlService_ReturnsDecoratorClass()
    {
        var loggerMock = new Mock<ILogger<SourceControlLoggingDecorator>>();
        var loggerFactoryMock = new Mock<ILoggerFactory>();
        loggerFactoryMock.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(loggerMock.Object);
        IServiceProvider serviceProvider = GetServiceProvider(loggerFactoryMock);

        ISourceControl service = serviceProvider.GetService<ISourceControl>();

        Assert.IsType<SourceControlLoggingDecorator>(service);
    }

    [Fact]
    public void DecoratedISourceControlService_Status_LogsErrorWithAdditionalInfo()
    {
        (ISourceControl service, Mock<ILogger<SourceControlLoggingDecorator>> loggerMock) = GetService();
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.Status(editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            await service.CloneRemoteRepository(editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            await service.CloneRemoteRepository(editingContext, "destination_path_should_not_exist", "branch_name_should_not_exist");
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            await service.DeleteRepository(editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.StageChange(editingContext, "file_should_not_exist");
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
        string org = "org_should_not_exist";
        string repo = "repo-should-not-exist";
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, "testUser");
        CommitInfo commitInfo = new() { Org = org, Repository = repo, Message = "should_not_be_commited" };
        try
        {
            service.Commit(commitInfo, editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            await service.CommitAndPushChanges(editingContext, "non-existing-branch", "non-existing-file", "should_not_be_commited");
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.CreateBranch(editingContext, "non-existing-branch");
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.CreatePullRequest(editingContext, "non-existing-target-branch", "non-existing-source-branch", "could-have-been-a-pull-request-title");
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            await service.FetchRemoteChanges(editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.GetLatestCommitForCurrentUser(editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.Log(editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.PullRemoteChanges(editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.Push(editingContext);
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
        string org = "org_should_not_exist";
        string repo = "repo-should-not-exist";
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, "testUser");
        CommitInfo commitInfo = new() { Org = org, Repository = repo, Message = "should_not_be_commited" };
        try
        {
            await service.PushChangesForRepository(commitInfo, editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            service.RepositoryStatus(editingContext);
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
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper("org_should_not_exist", "repo-should-not-exist", "testUser");
        try
        {
            await service.CloneIfNotExists(editingContext);
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
            service.StoreAppTokenForUser("some_random_token", "testUser");
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
        Mock<ILogger<SourceControlLoggingDecorator>> loggerMock = new();
        loggerMock
            .Setup(l => l.Log(
            It.Is<LogLevel>(l => l == LogLevel.Error),
            It.IsAny<EventId>(),
            It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Failed executing method")),
            It.IsAny<Exception>(),
            It.Is<Func<It.IsAnyType, Exception, string>>((v, t) => true)))
            .Verifiable();

        Mock<ILoggerFactory> loggerFactoryMock = new();
        loggerFactoryMock.Setup(f => f.CreateLogger(It.IsAny<string>())).Returns(loggerMock.Object);
        IServiceProvider serviceProvider = GetServiceProvider(loggerFactoryMock);
        ISourceControl service = serviceProvider.GetService<ISourceControl>();

        return (service, loggerMock);
    }

    public IServiceProvider GetServiceProvider(Mock<ILoggerFactory> loggerFactoryMock)
    {
        HttpContext httpContext = new DefaultHttpContext();

        Mock<IHttpContextAccessor> httpContextAccessorMock = new();
        httpContextAccessorMock.Setup(s => s.HttpContext).Returns(httpContext);
        Environment.SetEnvironmentVariable("OidcLoginSettings__ClientId", "test");
        Environment.SetEnvironmentVariable("OidcLoginSettings__ClientSecret", "test");

        IServiceProvider services = _webApplicationFactory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                services.AddSingleton(loggerFactoryMock.Object);
                services.AddSingleton(httpContextAccessorMock.Object);
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
    public Task<RepoStatus> CheckoutBranchWithValidation(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
    public void CheckoutRepoOnBranch(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
    public Task CloneIfNotExists(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Task<string> CloneRemoteRepository(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Task<string> CloneRemoteRepository(AltinnRepoEditingContext editingContext, string destinationPath, string branchName = "") => throw new NotImplementedException();
    public void Commit(CommitInfo commitInfo, AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Task CommitAndPushChanges(AltinnRepoEditingContext editingContext, string branchName, string localPath, string message, string accessToken = "") => throw new NotImplementedException();
    public void CommitToLocalRepo(AltinnRepoEditingContext editingContext, string message) => throw new NotImplementedException();
    public Task<Branch> CreateBranch(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
    public void CreateLocalBranch(AltinnRepoEditingContext editingContext, string branchName, string commitSha = null) => throw new NotImplementedException();
    public Task<bool> CreatePullRequest(AltinnRepoEditingContext editingContext, string target, string source, string title) => throw new NotImplementedException();
    public void DeleteLocalBranchIfExists(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
    public Task DeleteRemoteBranchIfExists(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
    public Task DeleteRepository(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public RepoStatus DiscardLocalChanges(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Task FetchGitNotes(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Task FetchRemoteChanges(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public string FindLocalRepoLocation(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Task<Dictionary<string, string>> GetChangedContent(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public CurrentBranchInfo GetCurrentBranch(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Commit GetLatestCommitForCurrentUser(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public List<Commit> Log(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public void MergeBranchIntoHead(AltinnRepoEditingContext editingContext, string featureBranch) => throw new NotImplementedException();
    public Task PublishBranch(AltinnRepoEditingContext editingContext, string branchName) => throw new NotImplementedException();
    public Task<RepoStatus> PullRemoteChanges(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Task<bool> Push(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public Task PushChangesForRepository(CommitInfo commitInfo, AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public LibGit2Sharp.RebaseResult RebaseOntoDefaultBranch(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public RepoStatus RepositoryStatus(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public void StageChange(AltinnRepoEditingContext editingContext, string fileName) => throw new NotImplementedException();
    public List<RepositoryContent> Status(AltinnRepoEditingContext editingContext) => throw new NotImplementedException();
    public void StoreAppTokenForUser(string token, string developer) => throw new NotImplementedException();
}

