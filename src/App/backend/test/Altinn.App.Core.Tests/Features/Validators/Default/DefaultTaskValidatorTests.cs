#nullable disable
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Moq;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class DefaultTaskValidatorTests
{
    private const string AppId = "tdd/test";
    private const string UnlimitedTaskId = "UnlimitedTask";
    private const string OneRequiredElementTaskId = "OneRequiredElement";
    private const string UnlimitedDataType = "UnlimitedDataId";
    private const string OneRequiredDataType = "OneRequiredDataId";

    private readonly ApplicationMetadata _applicationMetadata = new(AppId)
    {
        DataTypes = new List<DataType>()
        {
            new()
            {
                Id = UnlimitedDataType,
                TaskId = UnlimitedTaskId,
                MaxCount = 0,
                MinCount = 0,
            },
            new()
            {
                Id = OneRequiredDataType,
                TaskId = OneRequiredElementTaskId,
                MinCount = 1,
                MaxCount = 1,
            },
        },
    };

    private readonly Instance _instance = new Instance()
    {
        Id = $"1234/{Guid.NewGuid()}",
        AppId = AppId,
        Data = new List<DataElement>(),
    };

    private readonly Mock<IAppMetadata> _appMetadataMock = new();
    private readonly DefaultTaskValidator _sut;

    public DefaultTaskValidatorTests()
    {
        _appMetadataMock.Setup(a => a.GetApplicationMetadata()).ReturnsAsync(_applicationMetadata);
        _sut = new DefaultTaskValidator(_appMetadataMock.Object);
    }

    [Fact]
    public async Task UnknownTask_NoData_ReturnsNoErrors()
    {
        var issues = await _sut.ValidateTask(_instance, "unknownTask", null);
        issues.Should().BeEmpty();
    }

    [Fact]
    public async Task UnknownTask_UnknownData_ReturnsNoErrors()
    {
        _instance.Data.Add(new DataElement { DataType = "unknownDataType" });
        var issues = await _sut.ValidateTask(_instance, "unknownTask", null);
        issues.Should().BeEmpty();
    }

    [Fact]
    public async Task UnlimitedTask_NoData_ReturnsNoErrors()
    {
        var issues = await _sut.ValidateTask(_instance, UnlimitedTaskId, null);
        issues.Should().BeEmpty();
    }

    [Fact]
    public async Task UnlimitedTask_100Data_ReturnsNoErrors()
    {
        for (var i = 0; i < 100; i++)
        {
            _instance.Data.Add(new DataElement { DataType = UnlimitedDataType });
        }

        var issues = await _sut.ValidateTask(_instance, UnlimitedTaskId, null);
        issues.Should().BeEmpty();
    }

    [Fact]
    public async Task OneRequired_TheOneRequired_ReturnsNoErrors()
    {
        _instance.Data.Add(new() { DataType = OneRequiredDataType });
        var issues = await _sut.ValidateTask(_instance, OneRequiredElementTaskId, null);
        issues.Should().BeEmpty();
    }

    [Fact]
    public async Task OneRequired_NoData_ReturnsError()
    {
        var issues = await _sut.ValidateTask(_instance, OneRequiredElementTaskId, null);
        var issue = issues.Should().ContainSingle().Which;
        issue.Code.Should().Be("TooFewDataElementsOfType");
        issue.Severity.Should().Be(ValidationIssueSeverity.Error);
        issue.Field.Should().Be(OneRequiredDataType);
    }

    [Fact]
    public async Task OneRequired_2Data_ReturnsError()
    {
        _instance.Data.Add(new() { DataType = OneRequiredDataType });
        _instance.Data.Add(new() { DataType = OneRequiredDataType });
        var issues = await _sut.ValidateTask(_instance, OneRequiredElementTaskId, null);
        var issue = issues.Should().ContainSingle().Which;
        issue.Code.Should().Be("TooManyDataElementsOfType");
        issue.Severity.Should().Be(ValidationIssueSeverity.Error);
        issue.Field.Should().Be(OneRequiredDataType);
    }
}
