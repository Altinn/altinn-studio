using System.Diagnostics.CodeAnalysis;
using System.Security.Claims;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models;
using Altinn.App.Core.Tests.TestUtils;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using FluentAssertions;
using Moq;

namespace Altinn.App.Core.Tests.Features.Action;

public sealed class UniqueSignatureAuthorizerTests : IDisposable
{
    private readonly Mock<IProcessReader> _processReaderMock;
    private readonly Mock<IInstanceClient> _instanceClientMock;
    private readonly Mock<IDataClient> _dataClientMock;
    private readonly Mock<IAppMetadata> _appMetadataMock;
    private ApplicationMetadata? _applicationMetadata;

    public UniqueSignatureAuthorizerTests()
    {
        _processReaderMock = new Mock<IProcessReader>();
        _instanceClientMock = new Mock<IInstanceClient>();
        _dataClientMock = new Mock<IDataClient>();
        _appMetadataMock = new Mock<IAppMetadata>();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_uniqueFromSignaturesInDataTypes_not_defined()
    {
        ProcessElement processTask = new ProcessTask();
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(processTask);
        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                new ClaimsPrincipal(),
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(applicationMetadata: _applicationMetadata)
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_uniqueFromSignaturesInDataTypes_null()
    {
        ProcessElement? processTask = null;
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(processTask);
        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                new ClaimsPrincipal(),
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(applicationMetadata: _applicationMetadata)
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_SignatureConfiguration_is_null()
    {
        ProcessElement processTask = new ProcessTask()
        {
            ExtensionElements = new() { TaskExtension = new() { SignatureConfiguration = null } },
        };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(processTask);
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1000"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(userId: 1000, applicationMetadata: _applicationMetadata)
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_TaskExtension_is_null()
    {
        ProcessElement processTask = new ProcessTask() { ExtensionElements = new() { TaskExtension = null } };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(processTask);
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1000"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(
                    userId: 1000,
                    authenticationLevel: 2,
                    applicationMetadata: _applicationMetadata
                )
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_other_user_has_signed_previously()
    {
        ProcessElement processTask = new ProcessTask()
        {
            ExtensionElements = new()
            {
                TaskExtension = new()
                {
                    SignatureConfiguration = new() { UniqueFromSignaturesInDataTypes = new() { "signature" } },
                },
            },
        };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(processTask);
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1000"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(
                    userId: 1000,
                    authenticationLevel: 2,
                    applicationMetadata: _applicationMetadata
                )
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        _instanceClientMock.Verify(i =>
            i.GetInstance("xunit-app", "ttd", 500001, Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"))
        );
        _appMetadataMock.Verify(a => a.GetApplicationMetadata());
        _dataClientMock.Verify(d =>
            d.GetBinaryData(
                "ttd",
                "xunit-app",
                500001,
                Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"),
                Guid.Parse("ca62613c-f058-4899-b962-89dd6496a751"),
                It.IsAny<StorageAuthenticationMethod>(),
                It.IsAny<CancellationToken>()
            )
        );
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_false_if_same_user_has_signed_previously()
    {
        ProcessElement processTask = new ProcessTask()
        {
            ExtensionElements = new()
            {
                TaskExtension = new()
                {
                    SignatureConfiguration = new() { UniqueFromSignaturesInDataTypes = new() { "signature" } },
                },
            },
        };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(processTask);
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(
                    userId: 1337,
                    authenticationLevel: 2,
                    applicationMetadata: _applicationMetadata
                )
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        _instanceClientMock.Verify(i =>
            i.GetInstance("xunit-app", "ttd", 500001, Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"))
        );
        _appMetadataMock.Verify(a => a.GetApplicationMetadata());
        _dataClientMock.Verify(d =>
            d.GetBinaryData(
                "ttd",
                "xunit-app",
                500001,
                Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"),
                Guid.Parse("ca62613c-f058-4899-b962-89dd6496a751"),
                It.IsAny<StorageAuthenticationMethod>(),
                It.IsAny<CancellationToken>()
            )
        );
        result.Should().BeFalse();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_taskID_is_null()
    {
        ProcessElement processTask = new ProcessTask()
        {
            ExtensionElements = new()
            {
                TaskExtension = new()
                {
                    SignatureConfiguration = new() { UniqueFromSignaturesInDataTypes = new() { "signature" } },
                },
            },
        };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(processTask);
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                null,
                "sign",
                TestAuthentication.GetUserAuthentication(
                    userId: 1337,
                    authenticationLevel: 2,
                    applicationMetadata: _applicationMetadata
                )
            )
        );
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_dataelement_not_of_type_SignDocument()
    {
        ProcessElement processTask = new ProcessTask()
        {
            ExtensionElements = new()
            {
                TaskExtension = new()
                {
                    SignatureConfiguration = new() { UniqueFromSignaturesInDataTypes = new() { "signature" } },
                },
            },
        };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(
            processTask,
            "signing-task-process.bpmn"
        );
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(
                    userId: 1337,
                    authenticationLevel: 2,
                    applicationMetadata: _applicationMetadata
                )
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        _instanceClientMock.Verify(i =>
            i.GetInstance("xunit-app", "ttd", 500001, Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"))
        );
        _appMetadataMock.Verify(a => a.GetApplicationMetadata());
        _dataClientMock.Verify(d =>
            d.GetBinaryData(
                "ttd",
                "xunit-app",
                500001,
                Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"),
                Guid.Parse("ca62613c-f058-4899-b962-89dd6496a751"),
                It.IsAny<StorageAuthenticationMethod>(),
                It.IsAny<CancellationToken>()
            )
        );
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_signdumcument_is_missing_signee()
    {
        ProcessElement processTask = new ProcessTask()
        {
            ExtensionElements = new()
            {
                TaskExtension = new()
                {
                    SignatureConfiguration = new() { UniqueFromSignaturesInDataTypes = new() { "signature" } },
                },
            },
        };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(
            processTask,
            "signature-missing-signee.json"
        );
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(
                    userId: 1337,
                    authenticationLevel: 2,
                    applicationMetadata: _applicationMetadata
                )
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        _instanceClientMock.Verify(i =>
            i.GetInstance("xunit-app", "ttd", 500001, Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"))
        );
        _appMetadataMock.Verify(a => a.GetApplicationMetadata());
        _dataClientMock.Verify(d =>
            d.GetBinaryData(
                "ttd",
                "xunit-app",
                500001,
                Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"),
                Guid.Parse("ca62613c-f058-4899-b962-89dd6496a751"),
                It.IsAny<StorageAuthenticationMethod>(),
                It.IsAny<CancellationToken>()
            )
        );
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_signdumcument_is_missing_signee_userid()
    {
        ProcessElement processTask = new ProcessTask()
        {
            ExtensionElements = new()
            {
                TaskExtension = new()
                {
                    SignatureConfiguration = new() { UniqueFromSignaturesInDataTypes = new() { "signature" } },
                },
            },
        };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(
            processTask,
            "signature-missing-signee-userid.json"
        );
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(
                    userId: 1337,
                    authenticationLevel: 2,
                    applicationMetadata: _applicationMetadata
                )
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        _instanceClientMock.Verify(i =>
            i.GetInstance("xunit-app", "ttd", 500001, Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"))
        );
        _appMetadataMock.Verify(a => a.GetApplicationMetadata());
        _dataClientMock.Verify(d =>
            d.GetBinaryData(
                "ttd",
                "xunit-app",
                500001,
                Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"),
                Guid.Parse("ca62613c-f058-4899-b962-89dd6496a751"),
                It.IsAny<StorageAuthenticationMethod>(),
                It.IsAny<CancellationToken>()
            )
        );
        result.Should().BeTrue();
    }

    [Fact]
    public async Task AuthorizeAction_returns_true_if_signdumcument_signee_userid_is_null()
    {
        ProcessElement processTask = new ProcessTask()
        {
            ExtensionElements = new()
            {
                TaskExtension = new()
                {
                    SignatureConfiguration = new() { UniqueFromSignaturesInDataTypes = new() { "signature" } },
                },
            },
        };
        UniqueSignatureAuthorizer authorizer = CreateUniqueSignatureAuthorizer(
            processTask,
            "signature-signee-userid-null.json"
        );
        var user = new ClaimsPrincipal(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    new(AltinnCoreClaimTypes.Org, "tdd"),
                }
            )
        );

        bool result = await authorizer.AuthorizeAction(
            new UserActionAuthorizerContext(
                user,
                new InstanceIdentifier("500001/abba2e90-f86f-4881-b0e8-38334408bcb4"),
                "Task_2",
                "sign",
                TestAuthentication.GetUserAuthentication(
                    userId: 1337,
                    authenticationLevel: 2,
                    applicationMetadata: _applicationMetadata
                )
            )
        );
        _processReaderMock.Verify(p => p.GetFlowElement("Task_2"));
        _instanceClientMock.Verify(i =>
            i.GetInstance("xunit-app", "ttd", 500001, Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"))
        );
        _appMetadataMock.Verify(a => a.GetApplicationMetadata());
        _dataClientMock.Verify(d =>
            d.GetBinaryData(
                "ttd",
                "xunit-app",
                500001,
                Guid.Parse("abba2e90-f86f-4881-b0e8-38334408bcb4"),
                Guid.Parse("ca62613c-f058-4899-b962-89dd6496a751"),
                It.IsAny<StorageAuthenticationMethod>(),
                It.IsAny<CancellationToken>()
            )
        );
        result.Should().BeTrue();
    }

    [MemberNotNull(nameof(_applicationMetadata))]
    private UniqueSignatureAuthorizer CreateUniqueSignatureAuthorizer(
        ProcessElement? task,
        string signatureFileToRead = "signature.json"
    )
    {
        _processReaderMock.Setup(sr => sr.GetFlowElement(It.IsAny<string>())).Returns(task);
        _applicationMetadata = new ApplicationMetadata("ttd/xunit-app");
        _appMetadataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(_applicationMetadata);
        _instanceClientMock
            .Setup(i => i.GetInstance(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<Guid>()))
            .ReturnsAsync(
                new Instance()
                {
                    Data = new List<DataElement>()
                    {
                        new() { DataType = "signature", Id = "ca62613c-f058-4899-b962-89dd6496a751" },
                    },
                }
            );
        FileStream fileStream = File.OpenRead(
            Path.Combine(PathUtils.GetCoreTestsPath(), "Features", "Action", "TestData", signatureFileToRead)
        );
        _dataClientMock
            .Setup(d =>
                d.GetBinaryData(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(fileStream);
        return new UniqueSignatureAuthorizer(
            _processReaderMock.Object,
            _instanceClientMock.Object,
            _dataClientMock.Object,
            _appMetadataMock.Object
        );
    }

    public void Dispose()
    {
        _processReaderMock.VerifyNoOtherCalls();
        _instanceClientMock.VerifyNoOtherCalls();
        _dataClientMock.VerifyNoOtherCalls();
        _appMetadataMock.VerifyNoOtherCalls();
    }
}
