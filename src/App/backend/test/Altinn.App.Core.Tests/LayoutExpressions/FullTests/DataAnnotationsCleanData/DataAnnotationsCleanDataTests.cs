using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.App.Core.Tests.Features.Validators.Default;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit.Abstractions;
using DataType = Altinn.Platform.Storage.Interface.Models.DataType;

namespace Altinn.App.Core.Tests.LayoutExpressions.FullTests.DataAnnotationsCleanData;

/// <summary>
/// Verifies that <see cref="DataAnnotationValidator"/> validates the cleaned data model (data from hidden
/// components removed) when <c>AppSettings.RemoveHiddenData</c> is enabled, and the full data model otherwise.
/// </summary>
public class DataAnnotationsCleanDataTests(ITestOutputHelper outputHelper, DataAnnotationsTestFixture fixture)
    : IClassFixture<DataAnnotationsTestFixture>
{
    public class Model
    {
        public bool HideFields { get; set; }

        [Range(0, 100)]
        public decimal? VisibleRange { get; set; }

        [Range(0, 100)]
        public decimal? HiddenRange { get; set; }

        /// <summary>
        /// Bound to a hidden component with <c>removeWhenHidden: false</c>
        /// </summary>
        [Range(0, 100)]
        public decimal? HiddenRangeKeep { get; set; }

        [Required]
        public string? HiddenRequired { get; set; }

        /// <summary>
        /// Non-nullable value types are reset to <c>default</c> (0) when removed, not null
        /// </summary>
        [Range(1, 100)]
        public int HiddenNonNullableRange { get; set; }

        public List<Row?>? Group { get; set; }

        public class Row
        {
            [JsonPropertyName("altinnRowId")]
            [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
            public Guid AltinnRowId { get; set; }

            public bool HideRow { get; set; }

            [Range(0, 100)]
            public decimal? RowRange { get; set; }
        }
    }

    private const string DataTypeId = "mainLayout_dataType";

    /// <summary>
    /// All annotated fields hold invalid values. The hidden ones are only bound to components hidden by
    /// <see cref="Model.HideFields"/>, and the first group row is hidden by <c>hiddenRow</c>.
    /// </summary>
    private static Model CreateInvalidModel() =>
        new()
        {
            HideFields = true,
            VisibleRange = 999,
            HiddenRange = 999,
            HiddenRangeKeep = 999,
            HiddenRequired = "present while hidden",
            HiddenNonNullableRange = 999,
            Group = [new() { HideRow = true, RowRange = 999 }, new() { HideRow = false, RowRange = 999 }],
        };

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task Validate_RespectsRemoveHiddenData(bool removeHiddenData)
    {
        var data = CreateInvalidModel();
        var accessorFixture = await DataAccessorFixture.CreateAsync(
            [new("mainLayout", typeof(Model), MaxCount: 1)],
            outputHelper
        );
        accessorFixture.AddFormData(data);
        accessorFixture.AppSettings.RemoveHiddenData = removeHiddenData;
        accessorFixture
            .DataElementAccessCheckerMock.Setup(c => c.CanRead(It.IsAny<Instance>(), It.IsAny<DataType>()))
            .ReturnsAsync(true);

        var httpContextAccessor = new Mock<IHttpContextAccessor>();
        httpContextAccessor.SetupGet(a => a.HttpContext).Returns(new DefaultHttpContext());
        accessorFixture.ServiceCollection.AddSingleton(httpContextAccessor.Object);
        accessorFixture.ServiceCollection.AddSingleton(
            fixture.App.Services.GetRequiredService<IObjectModelValidator>()
        );
        accessorFixture.ServiceCollection.AddTransient<IFormDataValidator, DataAnnotationValidator>();

        await using var sp = accessorFixture.BuildServiceProvider();
        var dataUnitOfWorkInitializer = sp.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
        var dataMutator = await dataUnitOfWorkInitializer.Init(
            accessorFixture.Instance,
            DataAccessorFixture.TaskId,
            "nb"
        );
        var validationService = sp.GetRequiredService<IValidationService>();

        var dataType = dataMutator.GetDataType(DataTypeId);
        var changes = new DataElementChanges([
            new FormDataChange(
                contentType: "application/xml",
                dataType: dataType,
                dataElement: null,
                currentBinaryData: null,
                previousBinaryData: null,
                currentFormDataWrapper: FormDataWrapperFactory.Create(data, dataType, null),
                previousFormDataWrapper: FormDataWrapperFactory.Create(new Model(), dataType, null),
                type: ChangeType.Created
            ),
        ]);
        var incrementalIssues = await validationService.ValidateIncrementalFormData(
            dataMutator,
            DataAccessorFixture.TaskId,
            changes,
            [],
            "nb"
        );
        var fullIssues = await validationService.ValidateInstanceAtTask(
            dataMutator,
            DataAccessorFixture.TaskId,
            [],
            null,
            "nb"
        );

        var incrementalFields = incrementalIssues
            .Single(p => p.Source == ValidationIssueSources.DataAnnotations)
            .Issues.Select(i => i.Field)
            .ToList();
        var fullFields = fullIssues
            .Where(i => i.Source == ValidationIssueSources.DataAnnotations)
            .Select(i => i.Field)
            .ToList();

        foreach (var fields in new[] { incrementalFields, fullFields })
        {
            // Visible fields are validated regardless of the setting
            Assert.Contains("VisibleRange", fields);
            Assert.Contains("Group[1].RowRange", fields);

            if (removeHiddenData)
            {
                // Hidden fields are removed before validation, so their invalid values are not reported
                Assert.DoesNotContain("HiddenRange", fields);
                Assert.DoesNotContain("Group[0].RowRange", fields);
            }
            else
            {
                Assert.Contains("HiddenRange", fields);
                Assert.Contains("Group[0].RowRange", fields);
            }
        }

        // The snapshot documents the remaining behaviour, which is a consequence of how the clean accessor works:
        // * HiddenRangeKeep is removed for validation even with removeWhenHidden: false (the clean accessor
        //   ignores removeWhenHidden, while ProcessTaskFinalizer honours it).
        // * HiddenRequired only fails when hidden data is removed, because the removed value is null.
        // * HiddenNonNullableRange fails in both modes, because a removed int is reset to 0, not null.
        await Verify(new { IncrementalIssues = incrementalIssues, FullIssues = fullIssues })
            .UseParameters(removeHiddenData);
    }
}
