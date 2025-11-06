using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Microsoft.Extensions.DependencyInjection;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.RequiredValidator;

public class RequiredValidatorTests
{
    public class Model
    {
        public string? HiddenRequired { get; set; }
        public string? HiddenNotRequired { get; set; }
        public string? VisibleRequired { get; set; }
        public string? VisibleNotRequired { get; set; }
        public string? ServerValidatedNotTest { get; set; }
        public string? ServerValidatedHidden { get; set; }

        public List<MainComponentGroupItem?>? Group { get; set; }

        public class MainComponentGroupItem
        {
            [JsonPropertyName("altinnRowId")]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Guid AltinnRowId { get; set; }
            public int? GroupNumber { get; set; }
            public string? HiddenRequired { get; set; }
            public string? HiddenNotRequired { get; set; }
            public string? VisibleRequired { get; set; }
            public string? VisibleNotRequired { get; set; }
        }
    }

    // This test sets DataType.Id to data.GetType().Name, so we need different classes for
    // distinct data types
    public class SubModel : Model { }

    private readonly ITestOutputHelper _outputHelper;

    public RequiredValidatorTests(ITestOutputHelper outputHelper)
    {
        _outputHelper = outputHelper;
    }

    [Fact]
    public async Task ValidateEmpty_IssuesRequiredIssues()
    {
        await VerifyValidationIssues(new(), [new()]);
    }

    [Fact]
    public async Task ValidateAllRequiredFieldsMissing()
    {
        await VerifyValidationIssues(
            new()
            {
                VisibleRequired = null,
                ServerValidatedHidden = "test",
                ServerValidatedNotTest = "test",
                Group =
                [
                    new() { GroupNumber = 0, VisibleRequired = null },
                    new() { GroupNumber = 1, VisibleRequired = null },
                    new() { GroupNumber = 2, VisibleRequired = null },
                ],
            },
            [
                new()
                {
                    VisibleRequired = null,
                    Group =
                    [
                        new() { GroupNumber = 0, VisibleRequired = null },
                        new() { GroupNumber = 1, VisibleRequired = null },
                        new() { GroupNumber = 2, VisibleRequired = null },
                    ],
                },
            ]
        );
    }

    [Fact]
    public async Task VerifyAllOk()
    {
        await VerifyValidationIssues(
            new()
            {
                ServerValidatedHidden = "test",
                ServerValidatedNotTest = "something valid",
                VisibleRequired = "something valid",
                Group =
                [
                    new() { GroupNumber = 1, VisibleRequired = "something valid" },
                    new()
                    {
                        GroupNumber = -1,
                        VisibleRequired = null, // The row with GroupNumber -1 is not rendered in any group, so required properties can be null
                    },
                ],
            },
            [
                new()
                {
                    VisibleRequired = "something valid",
                    ServerValidatedHidden = "test",
                    ServerValidatedNotTest = "something valid", // This is not required, so it should not be an issue
                    Group =
                    [
                        new() { GroupNumber = 1, VisibleRequired = "something valid" },
                        new()
                        {
                            GroupNumber = -1,
                            VisibleRequired = null, // The row with GroupNumber -1 is not rendered in any group, so required properties can be null
                        },
                    ],
                },
            ]
        );
    }

    private async Task VerifyValidationIssues(Model data, SubModel[] subDatas)
    {
        var fixture = await DataAccessorFixture.CreateAsync(
            [new("mainLayout", typeof(Model), MaxCount: 1), new("subLayout", typeof(SubModel), MaxCount: 0)],
            _outputHelper
        );
        fixture.AddFormData(data);
        foreach (var subData in subDatas)
        {
            fixture.AddFormData(subData);
        }

        fixture.ServiceCollection.AddTransient<IValidator, TestValidator>();
        await using var sp = fixture.BuildServiceProvider();

        var dataUnitOfWorkInitializer = sp.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        var dataMutator = await dataUnitOfWorkInitializer.Init(
            fixture.Instance,
            DataAccessorFixture.TaskId,
            "test-language"
        );

        var validationService = sp.GetRequiredService<IValidationService>();
        var changes = new DataElementChanges(
            [
                new FormDataChange(
                    contentType: "application/xml",
                    dataType: dataMutator.GetDataType("mainLayout_dataType"),
                    dataElement: null,
                    currentBinaryData: null,
                    previousBinaryData: null,
                    currentFormDataWrapper: FormDataWrapperFactory.Create(data),
                    previousFormDataWrapper: FormDataWrapperFactory.Create(new Model()),
                    type: ChangeType.Created
                ),
            ]
        );
        var incrementalIssues = await validationService.ValidateIncrementalFormData(
            dataMutator,
            DataAccessorFixture.TaskId,
            changes,
            [],
            "test-language"
        );
        var fullIssues = await validationService.ValidateInstanceAtTask(
            dataMutator,
            DataAccessorFixture.TaskId,
            [],
            null,
            "test-language"
        );

        await Verify(new { IncrementalIssues = incrementalIssues, FullIssues = fullIssues });
    }

    private class TestValidator : IValidator
    {
        public string TaskId { get; } = DataAccessorFixture.TaskId;

        public bool ShouldRunAfterRemovingHiddenData => true;

        public async Task<List<ValidationIssue>> Validate(
            IInstanceDataAccessor dataAccessor,
            string taskId,
            string? language
        )
        {
            var issues = new List<ValidationIssue>();
            var models = await dataAccessor.GetAllFormData<Model>();
            foreach (var model in models)
            {
                if (model.ServerValidatedHidden?.Contains("test") == true)
                {
                    issues.Add(
                        new()
                        {
                            Severity = ValidationIssueSeverity.Error,
                            Description = $"ServerValidationHidden contains test in {model.GetType().Name}",
                        }
                    );
                }
                if (model.ServerValidatedNotTest?.Contains("test") == true)
                {
                    issues.Add(
                        new()
                        {
                            Severity = ValidationIssueSeverity.Error,
                            Description = $"ServerValidationNotTest contains test in {model.GetType().Name}",
                        }
                    );
                }
            }
            return issues;
        }

        public Task<bool> HasRelevantChanges(
            IInstanceDataAccessor dataAccessor,
            string taskId,
            DataElementChanges changes
        )
        {
            return Task.FromResult(changes.FormDataChanges.Any(c => c.DataType.Id == "mainLayout_dataType"));
        }
    }
}
