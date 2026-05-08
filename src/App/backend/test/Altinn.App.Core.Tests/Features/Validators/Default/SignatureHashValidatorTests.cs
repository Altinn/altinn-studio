using System.Diagnostics;
using System.Text;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using CoreSignee = Altinn.App.Core.Features.Signing.Models.Signee;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class SignatureHashValidatorTests
{
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<ISigningService> _signingServiceMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new();
    private readonly Mock<IAppMetadata> _appMetadataMock = new();
    private readonly Mock<IInstanceDataAccessor> _dataAccessorMock = new();
    private readonly SignatureHashValidator _validator;

    public SignatureHashValidatorTests()
    {
        _validator = new SignatureHashValidator(
            _signingServiceMock.Object,
            _processReaderMock.Object,
            _dataClientMock.Object,
            _appMetadataMock.Object,
            new Mock<IHttpContextAccessor>().Object,
            new Mock<ILogger<SignatureHashValidator>>().Object
        );

        _dataAccessorMock.Setup(x => x.Instance).Returns(CreateTestInstance());
    }

    [Fact]
    public async Task Validate_WithValidSignatureHashes_ReturnsEmptyList()
    {
        const string testData = "test data";
        const string expectedHash = "916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9";
        AltinnSignatureConfiguration signingConfiguration = new() { SignatureDataType = "signature" };
        ApplicationMetadata applicationMetadata = new("testorg/testapp")
        {
            DataTypes = [new DataType { Id = "form", ActionRequiredToRead = null }],
        };
        SigneeContext signeeContext = CreateSigneeContextWithValidHash(expectedHash);

        SetupMocks(signingConfiguration, applicationMetadata, [signeeContext], testData);

        List<ValidationIssue> result = await _validator.Validate(
            _dataAccessorMock.Object,
            "signing-task",
            LanguageConst.Nb
        );

        Assert.Empty(result);
    }

    [Theory]
    [InlineData(LanguageConst.Nb, "Signerte data er endret etter at signaturen ble utført.")]
    [InlineData(LanguageConst.Nn, "Signerte data er endra etter at signaturen vart utført.")]
    [InlineData(LanguageConst.En, "The signed data has been modified after the signature was made.")]
    [InlineData(null, "Signerte data er endret etter at signaturen ble utført.")]
    [InlineData("fr", "The signed data has been modified after the signature was made.")]
    public async Task Validate_WithInvalidSignatureHash_ReturnsValidationIssue(string? language, string description)
    {
        const string testData = "test data";
        const string storedHash = "different-hash";
        AltinnSignatureConfiguration signingConfiguration = new() { SignatureDataType = "signature" };
        ApplicationMetadata applicationMetadata = new("testorg/testapp")
        {
            DataTypes = [new DataType { Id = "form", ActionRequiredToRead = null }],
        };
        SigneeContext signeeContext = CreateSigneeContextWithValidHash(storedHash);

        SetupMocks(signingConfiguration, applicationMetadata, [signeeContext], testData);

        List<ValidationIssue> result = await _validator.Validate(_dataAccessorMock.Object, "signing-task", language);

        Assert.Single(result);
        Assert.Equal(ValidationIssueCodes.DataElementCodes.InvalidSignatureHash, result[0].Code);
        Assert.Equal(ValidationIssueSeverity.Error, result[0].Severity);
        Assert.Equal(description, result[0].Description);
    }

    [Fact]
    public async Task Validate_WithMissingSignatureConfiguration_ThrowsApplicationConfigException()
    {
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension("signing-task"))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = null });

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            _validator.Validate(_dataAccessorMock.Object, "signing-task", LanguageConst.Nb)
        );

        Assert.Equal("Signing configuration not found in AltinnTaskExtension", exception.Message);
    }

    [Fact]
    public async Task Validate_WithRestrictedReadDataType_UsesServiceOwnerAuth()
    {
        const string testData = "test data";
        const string expectedHash = "916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9";
        AltinnSignatureConfiguration signingConfiguration = new() { SignatureDataType = "signature" };
        ApplicationMetadata applicationMetadata = new("testorg/testapp")
        {
            DataTypes = [new DataType { Id = "form", ActionRequiredToRead = "read" }],
        };
        SigneeContext signeeContext = CreateSigneeContextWithValidHash(expectedHash);

        SetupMocks(signingConfiguration, applicationMetadata, [signeeContext], testData);

        await _validator.Validate(_dataAccessorMock.Object, "signing-task", LanguageConst.Nb);

        _dataClientMock.Verify(
            x =>
                x.GetBinaryDataStream(
                    12345,
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.Is<StorageAuthenticationMethod?>(auth => auth == StorageAuthenticationMethod.ServiceOwner()),
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Validate_WithNonRestrictedReadDataType_DoesNotUseServiceOwnerAuth()
    {
        const string testData = "test data";
        const string expectedHash = "916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9";
        var signingConfiguration = new AltinnSignatureConfiguration { SignatureDataType = "signature" };
        var applicationMetadata = new ApplicationMetadata("testorg/testapp")
        {
            DataTypes = [new DataType { Id = "form", ActionRequiredToRead = null }],
        };
        SigneeContext signeeContext = CreateSigneeContextWithValidHash(expectedHash);

        SetupMocks(signingConfiguration, applicationMetadata, [signeeContext], testData);

        await _validator.Validate(_dataAccessorMock.Object, "signing-task", LanguageConst.Nb);

        _dataClientMock.Verify(
            x =>
                x.GetBinaryDataStream(
                    12345,
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Validate_WithDataTypeNotFoundInApplicationMetadata_ThrowsApplicationConfigException()
    {
        const string testData = "test data";
        const string expectedHash = "916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9";
        AltinnSignatureConfiguration signingConfiguration = new() { SignatureDataType = "signature" };
        ApplicationMetadata applicationMetadata = new("testorg/testapp") { DataTypes = [] };
        SigneeContext signeeContext = CreateSigneeContextWithValidHash(expectedHash);

        SetupMocks(signingConfiguration, applicationMetadata, [signeeContext], testData);

        var exception = await Assert.ThrowsAsync<ApplicationConfigException>(() =>
            _validator.Validate(_dataAccessorMock.Object, "signing-task", LanguageConst.Nb)
        );

        Assert.Equal(
            "Unable to find data type form for data element 550e8400-e29b-41d4-a716-446655440001 in applicationmetadata.json.",
            exception.Message
        );
    }

    [Fact]
    public async Task Validate_WithMultipleSigneeContexts_ValidatesAllSignatures()
    {
        const string testData = "test data";
        const string expectedHash = "916f0027a575074ce72a331777c3478d6513f786a591bd892da1a577bf2335f9";
        AltinnSignatureConfiguration signingConfiguration = new() { SignatureDataType = "signature" };
        ApplicationMetadata applicationMetadata = new("testorg/testapp")
        {
            DataTypes = [new DataType { Id = "form", ActionRequiredToRead = null }],
        };
        List<SigneeContext> signeeContexts =
        [
            CreateSigneeContextWithValidHash(expectedHash),
            CreateSigneeContextWithValidHash(expectedHash),
        ];

        SetupMocks(signingConfiguration, applicationMetadata, signeeContexts, testData);

        List<ValidationIssue> result = await _validator.Validate(
            _dataAccessorMock.Object,
            "signing-task",
            LanguageConst.Nb
        );

        Assert.Empty(result);
        _dataClientMock.Verify(
            x =>
                x.GetBinaryDataStream(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task Validate_WithSigneeContextWithoutSignDocument_SkipsValidation()
    {
        AltinnSignatureConfiguration signingConfiguration = new() { SignatureDataType = "signature" };
        ApplicationMetadata applicationMetadata = new("testorg/testapp")
        {
            DataTypes = [new DataType { Id = "form", ActionRequiredToRead = null }],
        };
        SigneeContext signeeContext = new()
        {
            TaskId = "signing-task",
            Signee = new CoreSignee.PersonSignee
            {
                SocialSecurityNumber = "12345678901",
                FullName = "Test Person",
                Party = new Party(),
            },
            SigneeState = new SigneeContextState { IsAccessDelegated = false },
            SignDocument = null,
        };

        SetupMocks(signingConfiguration, applicationMetadata, [signeeContext], "test");

        List<ValidationIssue> result = await _validator.Validate(
            _dataAccessorMock.Object,
            "signing-task",
            LanguageConst.Nb
        );

        Assert.Empty(result);
        _dataClientMock.Verify(
            x =>
                x.GetBinaryDataStream(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    null,
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public void TaskId_ShouldReturnAsterisk()
    {
        Assert.Equal("*", _validator.TaskId);
    }

    [Fact]
    public void NoIncrementalValidation_ShouldReturnTrue()
    {
        Assert.True(_validator.NoIncrementalValidation);
    }

    [Fact]
    public void ShouldRunForTask_WithSigningTask_ReturnsTrue()
    {
        AltinnTaskExtension taskConfig = new() { TaskType = "signing" };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("signing-task")).Returns(taskConfig);

        bool result = _validator.ShouldRunForTask("signing-task");

        Assert.True(result);
    }

    [Fact]
    public void ShouldRunForTask_WithNonSigningTask_ReturnsFalse()
    {
        AltinnTaskExtension taskConfig = new() { TaskType = AltinnTaskTypes.Data };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("data-task")).Returns(taskConfig);

        bool result = _validator.ShouldRunForTask("data-task");

        Assert.False(result);
    }

    [Fact]
    public void ShouldRunForTask_WithNullTaskType_ReturnsFalse()
    {
        AltinnTaskExtension taskConfig = new() { TaskType = null };
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("task")).Returns(taskConfig);

        bool result = _validator.ShouldRunForTask("task");

        Assert.False(result);
    }

    [Fact]
    public void ShouldRunForTask_Exception_BubblesUp()
    {
        var mockedException = new Exception("Exception bubbles up");
        _processReaderMock.Setup(x => x.GetAltinnTaskExtension("task")).Throws(mockedException);

        var thrownException = Assert.Throws<Exception>(() => _validator.ShouldRunForTask("task"));

        Assert.True(thrownException.Message == mockedException.Message);
    }

    [Fact]
    public async Task HasRelevantChanges_ShouldThrowUnreachableException()
    {
        DataElementChanges changes = new([]);

        var exception = await Assert.ThrowsAsync<UnreachableException>(() =>
            _validator.HasRelevantChanges(_dataAccessorMock.Object, "task", changes)
        );

        Assert.Equal(
            "HasRelevantChanges should not be called because NoIncrementalValidation is true.",
            exception.Message
        );
    }

    private static Instance CreateTestInstance()
    {
        return new Instance
        {
            Id = "12345/550e8400-e29b-41d4-a716-446655440000",
            Org = "testorg",
            AppId = "testapp",
            Data = [new DataElement { Id = "550e8400-e29b-41d4-a716-446655440001", DataType = "form" }],
        };
    }

    private static SigneeContext CreateSigneeContextWithValidHash(string hash)
    {
        return new SigneeContext
        {
            TaskId = "signing-task",
            Signee = new CoreSignee.PersonSignee
            {
                SocialSecurityNumber = "12345678901",
                FullName = "Test Person",
                Party = new Party(),
            },
            SigneeState = new SigneeContextState { IsAccessDelegated = false },
            SignDocument = new SignDocument
            {
                DataElementSignatures =
                [
                    new SignDocument.DataElementSignature
                    {
                        DataElementId = "550e8400-e29b-41d4-a716-446655440001",
                        Sha256Hash = hash,
                    },
                ],
            },
        };
    }

    private void SetupMocks(
        AltinnSignatureConfiguration signingConfiguration,
        ApplicationMetadata applicationMetadata,
        List<SigneeContext> signeeContexts,
        string dataElementStringContent
    )
    {
        _processReaderMock
            .Setup(x => x.GetAltinnTaskExtension("signing-task"))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = signingConfiguration });

        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);

        _signingServiceMock
            .Setup(x =>
                x.GetSigneeContexts(
                    It.Is<IInstanceDataAccessor>(d => d == _dataAccessorMock.Object),
                    It.Is<AltinnSignatureConfiguration>(c => c == signingConfiguration),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(signeeContexts);

        _dataClientMock
            .Setup(x =>
                x.GetBinaryDataStream(
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(() => new MemoryStream(Encoding.UTF8.GetBytes(dataElementStringContent)));
    }
}
