using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Serialization;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features.Validation.Default;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Features.Validators.Default;

public class DataAnnotationValidatorTests : IClassFixture<DataAnnotationsTestFixture>
{
    private readonly DataAnnotationValidator _validator;

    public DataAnnotationValidatorTests(DataAnnotationsTestFixture fixture)
    {
        _validator = fixture.App.Services.GetRequiredKeyedService<DataAnnotationValidator>(
            DataAnnotationsTestFixture.DataType
        );
    }

    private class TestClass
    {
        [Required]
        [JsonPropertyName("requiredProperty")]
        public string? RequiredProperty { get; set; }

        [StringLength(5)]
        [JsonPropertyName("stringLength")]
        public string? StringLengthProperty { get; set; }

        [Range(1, 10)]
        [JsonPropertyName("range")]
        public int RangeProperty { get; set; }

        [RegularExpression("^[0-9]*$")]
        [JsonPropertyName("regularExpression")]
        public string? RegularExpressionProperty { get; set; }

        [EmailAddress]
        public string? EmailAddressProperty { get; set; }

        public TestClass? NestedProperty { get; set; }
    }

    [Fact]
    public async Task ValidateFormData()
    {
        // Arrange
        var instance = new Instance();
        var dataElement = new DataElement();
        var data = new object();

        // Prepare

        // Act
        var result = await _validator.ValidateFormData(instance, dataElement, data, null);

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task Validate_ValidFormData_NoErrors()
    {
        // Arrange
        var instance = new Instance();
        var dataElement = new DataElement();
        var data = new TestClass()
        {
            RangeProperty = 3,
            RequiredProperty = "test",
            EmailAddressProperty = "test@altinn.no",
            RegularExpressionProperty = "12345",
            StringLengthProperty = "12345",
            NestedProperty = new TestClass()
            {
                RangeProperty = 3,
                RequiredProperty = "test",
                EmailAddressProperty = "test@altinn.no",
                RegularExpressionProperty = "12345",
                StringLengthProperty = "12345",
            },
        };

        // Act
        var result = await _validator.ValidateFormData(instance, dataElement, data, null);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task ValidateFormData_RequiredProperty()
    {
        // Arrange
        var instance = new Instance();
        var dataElement = new DataElement();
        var data = new TestClass() { NestedProperty = new() };

        // Act
        var result = await _validator.ValidateFormData(instance, dataElement, data, null);

        // Assert
        result.Should().NotBeNull();
        result
            .Should()
            .BeEquivalentTo(
                JsonSerializer.Deserialize<List<ValidationIssue>>(
                    """
                    [
                      {
                        "severity": 1,
                        "instanceId": null,
                        "dataElementId": null,
                        "field": "range",
                        "code": "The field RangeProperty must be between 1 and 10.",
                        "description": "The field RangeProperty must be between 1 and 10.",
                        "source": null,
                        "customTextKey": null
                      },
                      {
                        "severity": 1,
                        "instanceId": null,
                        "dataElementId": null,
                        "field": "requiredProperty",
                        "code": "The RequiredProperty field is required.",
                        "description": "The RequiredProperty field is required.",
                        "source": null,
                        "customTextKey": null
                      },
                      {
                        "severity": 1,
                        "instanceId": null,
                        "dataElementId": null,
                        "field": "NestedProperty.range",
                        "code": "The field RangeProperty must be between 1 and 10.",
                        "description": "The field RangeProperty must be between 1 and 10.",
                        "source": null,
                        "customTextKey": null
                      },
                      {
                        "severity": 1,
                        "instanceId": null,
                        "dataElementId": null,
                        "field": "NestedProperty.requiredProperty",
                        "code": "The RequiredProperty field is required.",
                        "description": "The RequiredProperty field is required.",
                        "source": null,
                        "customTextKey": null
                      }
                    ]
                    """
                )
            );
    }
}

/// <summary>
/// System.ComponentModel.DataAnnotations does not provide an easy way to run validations recursively in a unit test,
/// so we need to instantiate a WebApplication to get the IObjectModelValidator.
///
/// A full WebApplicationFactory seemed a little overkill, so we just use a WebApplicationBuilder.
/// </summary>
public sealed class DataAnnotationsTestFixture : IAsyncDisposable
{
    public const string DataType = "test";

    private readonly DefaultHttpContext _httpContext = new DefaultHttpContext();

    private readonly Mock<IHttpContextAccessor> _httpContextAccessor = new Mock<IHttpContextAccessor>();

    public WebApplication App { get; }

    public DataAnnotationsTestFixture()
    {
        WebApplicationBuilder builder = WebApplication.CreateBuilder();
        builder.Services.AddMvc();
        builder.Services.AddKeyedTransient<DataAnnotationValidator>(DataType);
        _httpContextAccessor.Setup(a => a.HttpContext).Returns(_httpContext);
        builder.Services.AddSingleton(_httpContextAccessor.Object);
        builder.Services.Configure<GeneralSettings>(builder.Configuration.GetSection("GeneralSettings"));
        App = builder.Build();
    }

    public ValueTask DisposeAsync()
    {
        return App.DisposeAsync();
    }
}
