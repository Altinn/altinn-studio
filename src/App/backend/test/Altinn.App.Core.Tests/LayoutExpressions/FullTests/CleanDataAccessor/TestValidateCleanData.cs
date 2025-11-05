using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.CleanDataAccessor;

public class TestValidateCleanData(ITestOutputHelper outputHelper)
{
    [Fact]
    public async Task CleanIncremental()
    {
        await RunTest(incremental: true, removeHidden: true);
    }

    [Fact]
    public async Task CleanFull()
    {
        await RunTest(incremental: false, removeHidden: true);
    }

    [Fact]
    public async Task DirtyIncremental()
    {
        await RunTest(incremental: true, removeHidden: false);
    }

    [Fact]
    public async Task DirtyFull()
    {
        await RunTest(incremental: false, removeHidden: false);
    }

    private async Task RunTest(bool incremental, bool removeHidden)
    {
        var data = new MainModel()
        {
            HideMainComponentGroup = false,
            HideMainTitle = false, // This is changed in the diff
            HidePage1 = false,
            HideSubLayout = false,
            MainTitle = "Main Title",
            MainComponentGroup =
            [
                new()
                {
                    Name = "row1",
                    Description = "row1 description",
                    HideName = false,
                    HideRow = false,
                },
                new()
                {
                    Name = "row2",
                    Description = "row2 description",
                    HideName = false,
                    HideRow = true,
                },
                new()
                {
                    Name = "row3",
                    Description = "row3 description",
                    HideName = true,
                    HideRow = false,
                },
                new() { Name = "row4", HideRow = true },
                new() { Name = "row5", HideRow = false },
            ],
        };
        var subData1 = new SubModel() { SubPageTitle = "", UnboundField = "unbound1" };
        var subData2 = new SubModel()
        {
            HideSubPageTitle = false,
            SubPageTitle = "sub2 title",
            SubComponentGroup = [new() { Name = "subGroup1" }],
        };

        var validatorMock = GetValidatorMock(
            shouldRunAfterRemovingHiddenData: removeHidden,
            noIncrementalValidation: false
        );

        var fixture = await DataAccessorFixture.CreateAsync(
            [new("mainLayout", typeof(MainModel), MaxCount: 1), new("subLayout", typeof(SubModel), MaxCount: 0)],
            outputHelper
        );
        fixture.AddFormData(data);
        fixture.AddFormData(subData1);
        fixture.AddFormData(subData2);

        fixture.ServiceCollection.AddSingleton(validatorMock.Object);

        await using var sp = fixture.BuildServiceProvider();

        var dataUnitOfWorkInitializer = sp.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        var dataMutator = await dataUnitOfWorkInitializer.Init(
            fixture.Instance,
            DataAccessorFixture.TaskId,
            "test-language"
        );

        var validationService = sp.GetRequiredService<IValidationService>();

        var element = await dataMutator.GetFormData<MainModel>();
        Assert.NotNull(element);
        element.HideMainTitle = true;
        var subElements = await dataMutator.GetAllFormData<SubModel>();
        foreach (var subElement in subElements)
        {
            subElement.HideSubPageTitle = true;
        }

        var changes = dataMutator.GetDataElementChanges(initializeAltinnRowId: true);
        if (incremental)
        {
            await validationService.ValidateIncrementalFormData(
                dataMutator,
                DataAccessorFixture.TaskId,
                changes,
                [],
                "test-language"
            );
        }
        else
        {
            await validationService.ValidateInstanceAtTask(
                dataMutator,
                DataAccessorFixture.TaskId,
                [],
                null,
                "test-language"
            );
        }
        await Verify(validatorMock)
            .IgnoreMember(nameof(DataElementChanges.FormDataChanges)) // Also included in AllChanges
            .IgnoreMember(nameof(DataElementChanges.BinaryDataChanges)) // Also included in AllChanges
            .AddNamedGuid(DataAccessorFixture.InstanceGuid, "instanceGuid");
    }

    private static Mock<IValidator> GetValidatorMock(
        bool shouldRunAfterRemovingHiddenData,
        bool noIncrementalValidation
    )
    {
        var mock = new Mock<IValidator>(MockBehavior.Strict);
        mock.Setup(v => v.Validate(It.IsAny<IInstanceDataAccessor>(), It.IsAny<string>(), It.IsAny<string?>()))
            .ReturnsAsync(new List<ValidationIssue>());
        mock.SetupGet(v => v.ShouldRunAfterRemovingHiddenData).Returns(shouldRunAfterRemovingHiddenData);
        mock.SetupGet(v => v.NoIncrementalValidation).Returns(noIncrementalValidation);
        mock.Setup(v => v.ShouldRunForTask(DataAccessorFixture.TaskId)).Returns(true);
        mock.SetupGet(v => v.ValidationSource).Returns("mockValidator");
        if (!noIncrementalValidation)
        {
            mock.Setup(v =>
                    v.HasRelevantChanges(
                        It.IsAny<IInstanceDataAccessor>(),
                        It.IsAny<string>(),
                        It.IsAny<DataElementChanges>()
                    )
                )
                .ReturnsAsync(true);
        }
        else
        {
            mock.Setup(v =>
                    v.HasRelevantChanges(
                        It.IsAny<IInstanceDataAccessor>(),
                        It.IsAny<string>(),
                        It.IsAny<DataElementChanges>()
                    )
                )
                .Throws(
                    new UnreachableException(
                        "HasRelevantChanges should never be called when not using incremental validation"
                    )
                );
        }

        return mock;
    }
}
