using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Signing.Models;
using Altinn.App.Core.Features.Signing.Services;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Moq;
using static Altinn.App.Core.Features.Signing.Models.Signee;
using SigneeState = Altinn.App.Core.Features.Signing.Models.SigneeContextState;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class SigningTaskValidatorTest
{
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<ISigningService> _signingServiceMock = new();
    private readonly Mock<IAppMetadata> _appMetadataMock = new();
    private readonly Mock<ILogger<SigningTaskValidator>> _loggerMock = new();
    private readonly SigningTaskValidator _validator;

    public SigningTaskValidatorTest()
    {
        _validator = new SigningTaskValidator(
            _loggerMock.Object,
            _processReaderMock.Object,
            _signingServiceMock.Object,
            _appMetadataMock.Object
        );
    }

    [Fact]
    public async Task Validate_ShouldReturnEmptyList_WhenAllHaveSigned()
    {
        // Arrange
        var dataAccessorMock = new Mock<IInstanceDataAccessor>();
        dataAccessorMock.Setup(da => da.Instance).Returns(new Instance());

        var taskId = "task1";
        var signatureDataType = "signatures";

        var signingConfiguration = new AltinnSignatureConfiguration() { SignatureDataType = signatureDataType };
        var appMetadata = new ApplicationMetadata("org/app")
        {
            DataTypes = [new DataType { Id = signatureDataType, MinCount = 1 }],
        };
        var signeeContexts = new List<SigneeContext>
        {
            new()
            {
                SignDocument = new SignDocument(),
                TaskId = taskId,
                Signee = new PersonSignee
                {
                    FullName = "A signee",
                    SocialSecurityNumber = "12334456674",
                    Party = new Party(),
                },
                SigneeState = new SigneeState(),
            },
        };

        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(taskId))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = signingConfiguration });
        _appMetadataMock.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(appMetadata);
        _signingServiceMock
            .Setup(ss =>
                ss.GetSigneeContexts(It.IsAny<IInstanceDataAccessor>(), signingConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signeeContexts);

        // Act
        var result = await _validator.Validate(dataAccessorMock.Object, taskId, null);

        // Assert
        Assert.Empty(result);
    }

    [Theory]
    [InlineData(LanguageConst.Nb, "Det mangler påkrevde signaturer.")]
    [InlineData(LanguageConst.Nn, "Det manglar påkravde signaturar.")]
    [InlineData(LanguageConst.En, "Required signatures are missing.")]
    [InlineData(null, "Det mangler påkrevde signaturer.")]
    [InlineData("fr", "Required signatures are missing.")]
    public async Task Validate_ShouldReturnValidationIssue_WhenNotAllHaveSigned(string? language, string description)
    {
        // Arrange
        var dataAccessorMock = new Mock<IInstanceDataAccessor>();
        dataAccessorMock.Setup(da => da.Instance).Returns(new Instance());

        var taskId = "task1";
        var signatureDataType = "signatures";

        var signingConfiguration = new AltinnSignatureConfiguration() { SignatureDataType = signatureDataType };
        var appMetadata = new ApplicationMetadata("org/app")
        {
            DataTypes = [new DataType { Id = signatureDataType, MinCount = 1 }],
        };

        List<SigneeContext> signeeContexts =
        [
            new()
            {
                SignDocument = null,
                TaskId = taskId,
                SigneeState = new SigneeState(),
                Signee = new PersonSignee
                {
                    FullName = "A signee",
                    SocialSecurityNumber = "12334456674",
                    Party = new Party(),
                },
            },
        ];

        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(taskId))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = signingConfiguration });
        _appMetadataMock.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(appMetadata);
        _signingServiceMock
            .Setup(ss =>
                ss.GetSigneeContexts(It.IsAny<IInstanceDataAccessor>(), signingConfiguration, CancellationToken.None)
            )
            .ReturnsAsync(signeeContexts);

        // Act
        var result = await _validator.Validate(dataAccessorMock.Object, taskId, language);

        // Assert
        Assert.Single(result);
        Assert.Equal(ValidationIssueCodes.DataElementCodes.MissingSignatures, result[0].Code);
        Assert.Equal(description, result[0].Description);
    }

    [Fact]
    public async Task Validate_ShouldReturnEmptyListAndLogError_WhenAppMetadataFetchFails()
    {
        // Arrange
        var dataAccessorMock = new Mock<IInstanceDataAccessor>();
        dataAccessorMock.Setup(da => da.Instance).Returns(new Instance());
        var taskId = "task1";
        var signingConfiguration = new AltinnSignatureConfiguration();
        var exception = new Exception("Error fetching metadata");

        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(taskId))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = signingConfiguration });
        _appMetadataMock.Setup(am => am.GetApplicationMetadata()).ThrowsAsync(exception);

        // Act
        await Assert.ThrowsAsync<Exception>(async () =>
            await _validator.Validate(dataAccessorMock.Object, taskId, null)
        );
    }

    [Fact]
    public async Task Validate_ShouldLogError_WhenSigneeContextsFetchFails()
    {
        // Arrange
        var dataAccessorMock = new Mock<IInstanceDataAccessor>();
        dataAccessorMock.Setup(da => da.Instance).Returns(new Instance());
        var taskId = "task1";
        var signingConfiguration = new AltinnSignatureConfiguration();
        var appMetadata = new ApplicationMetadata("org/app");
        var exception = new Exception("Error fetching signee contexts");

        _processReaderMock
            .Setup(pr => pr.GetAltinnTaskExtension(taskId))
            .Returns(new AltinnTaskExtension { SignatureConfiguration = signingConfiguration });
        _appMetadataMock.Setup(am => am.GetApplicationMetadata()).ReturnsAsync(appMetadata);
        _signingServiceMock
            .Setup(ss =>
                ss.GetSigneeContexts(It.IsAny<IInstanceDataAccessor>(), signingConfiguration, CancellationToken.None)
            )
            .ThrowsAsync(exception);

        // Act
        await Assert.ThrowsAsync<Exception>(async () =>
            await _validator.Validate(dataAccessorMock.Object, taskId, null)
        );
    }
}
