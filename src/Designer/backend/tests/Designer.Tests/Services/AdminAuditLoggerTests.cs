using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Time.Testing;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class AdminAuditLoggerTests
{
    private const string Org = "ttd";
    private const string Env = "tt02";
    private const string App = "test-app";
    private const string InstanceId = "51e58b12-6de1-4d0f-9052-ec2ee9d43adf";
    private const string UserName = "testDeveloper";

    private readonly Mock<IAdminAuditLogRepository> _repositoryMock = new();
    private readonly FakeTimeProvider _timeProvider = new();

    [Fact]
    public async Task LogInstanceDeletedAsync_WritesEntryWithUserNameAndTimestamp()
    {
        var httpContextAccessor = CreateHttpContextAccessorWithAuthenticatedUser();
        AdminAuditLogEntry capturedEntry = null;
        _repositoryMock
            .Setup(r => r.AddAsync(It.IsAny<AdminAuditLogEntry>(), It.IsAny<CancellationToken>()))
            .Callback<AdminAuditLogEntry, CancellationToken>((entry, _) => capturedEntry = entry)
            .Returns(Task.CompletedTask);
        var auditLogger = new AdminAuditLogger(_repositoryMock.Object, httpContextAccessor, _timeProvider);

        await auditLogger.LogInstanceDeletedAsync(Org, Env, App, InstanceId);

        Assert.NotNull(capturedEntry);
        Assert.Equal(Org, capturedEntry.Org);
        Assert.Equal(Env, capturedEntry.Env);
        Assert.Equal(App, capturedEntry.App);
        Assert.Equal(InstanceId, capturedEntry.InstanceId);
        Assert.Equal(AdminAuditActions.DeleteInstance, capturedEntry.Action);
        Assert.Equal(UserName, capturedEntry.UserName);
        Assert.Equal(_timeProvider.GetUtcNow(), capturedEntry.Timestamp);
    }

    private static IHttpContextAccessor CreateHttpContextAccessorWithAuthenticatedUser()
    {
        var identity = new ClaimsIdentity(new[] { new Claim(ClaimTypes.Name, UserName) }, "TestAuthentication");
        var httpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
        var httpContextAccessorMock = new Mock<IHttpContextAccessor>();
        httpContextAccessorMock.Setup(a => a.HttpContext).Returns(httpContext);
        return httpContextAccessorMock.Object;
    }
}
