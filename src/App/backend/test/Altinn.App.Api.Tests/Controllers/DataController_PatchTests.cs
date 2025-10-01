using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Api.Models;
using Altinn.App.Api.Tests.Data;
using Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Language;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Storage.Interface.Models;
using App.IntegrationTests.Mocks.Services;
using FluentAssertions;
using Json.More;
using Json.Patch;
using Json.Pointer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit.Abstractions;

namespace Altinn.App.Api.Tests.Controllers;

public class DataControllerPatchTests : ApiTestBase, IClassFixture<WebApplicationFactory<Program>>
{
    internal static readonly JsonSerializerOptions _jsonSerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        UnknownTypeHandling = JsonUnknownTypeHandling.JsonElement,
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    // Define constants
    private const string Org = "tdd";
    private const string App = "contributer-restriction";
    private const int UserId = 1337;
    private const int InstanceOwnerPartyId = 500600;
    private static readonly Guid _instanceGuid = new("0fc98a23-fe31-4ef5-8fb9-dd3f479354ce");
    private static readonly string _instanceId = $"{InstanceOwnerPartyId}/{_instanceGuid}";
    private static readonly Guid _dataGuid = new("fc121812-0336-45fb-a75c-490df3ad5109");
    private static readonly Guid _binaryDataGuid = new("fc121812-0336-45fb-a75c-490df3ad510a");

    // Define mocks
    private readonly Mock<IDataProcessor> _dataProcessorMock = new(MockBehavior.Strict);
    private readonly Mock<IFormDataValidator> _formDataValidatorMock = new(MockBehavior.Strict);

    private HttpClient? _client;

    private HttpClient GetClient() => _client ??= GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);

    // Constructor with common setup
    public DataControllerPatchTests(WebApplicationFactory<Program> factory, ITestOutputHelper outputHelper)
        : base(factory, outputHelper)
    {
        _formDataValidatorMock.Setup(v => v.DataType).Returns("9edd53de-f46f-40a1-bb4d-3efb93dc113d");
        _formDataValidatorMock.Setup(v => v.ValidationSource).Returns("Not a valid validation source");
        _formDataValidatorMock.SetupGet(v => v.NoIncrementalValidation).Returns(false);
        OverrideServicesForAllTests = (services) =>
        {
            services.AddSingleton(_dataProcessorMock.Object);
            services.AddSingleton(_formDataValidatorMock.Object);
        };
        TestData.PrepareInstance(Org, App, InstanceOwnerPartyId, _instanceGuid);
    }

    // Helper method to call the API
    private async Task<(
        HttpResponseMessage response,
        string responseString,
        TResponse parsedResponse
    )> CallPatchApi<TResponse>(
        JsonPatch patch,
        List<string>? ignoredValidators,
        HttpStatusCode expectedStatus,
        string? language = null
    )
    {
        var url = $"/{Org}/{App}/instances/{_instanceId}/data/{_dataGuid}";
        if (language is not null)
        {
            url += $"?language={language}";
        }
        OutputHelper.WriteLine($"Calling PATCH {url}");
        using var httpClient = GetRootedClient(Org, App);
        string token = TestAuthentication.GetUserToken(userId: 1337);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            token
        );
        var serializedPatch = JsonSerializer.Serialize(
            new DataPatchRequest() { Patch = patch, IgnoredValidators = ignoredValidators },
            _jsonSerializerOptions
        );
        OutputHelper.WriteLine(serializedPatch);
        using var updateDataElementContent = new StringContent(serializedPatch, Encoding.UTF8, "application/json");
        var response = await GetClient().PatchAsync(url, updateDataElementContent);
        var responseString = await response.Content.ReadAsStringAsync();
        using var responseParsedRaw = JsonDocument.Parse(responseString);
        OutputHelper.WriteLine("\nResponse:");
        OutputHelper.WriteLine(JsonSerializer.Serialize(responseParsedRaw, _jsonSerializerOptions));
        response.Should().HaveStatusCode(expectedStatus);
        var responseObject = JsonSerializer.Deserialize<TResponse>(responseString, _jsonSerializerOptions)!;
        return (response, responseString, responseObject);
    }

    // Helper method to call the API
    private async Task<(
        HttpResponseMessage response,
        string responseString,
        TResponse parsedResponse
    )> CallPatchMultipleApi<TResponse>(
        DataPatchRequestMultiple requestMultiple,
        HttpStatusCode expectedStatus,
        string? language = null
    )
    {
        var url = $"/{Org}/{App}/instances/{_instanceId}/data";
        if (language is not null)
        {
            url += $"?language={language}";
        }
        OutputHelper.WriteLine($"Calling PATCH {url}");
        var serializedPatch = JsonSerializer.Serialize(requestMultiple, _jsonSerializerOptions);
        OutputHelper.WriteLine(serializedPatch);
        using var updateDataElementContent = new StringContent(serializedPatch, Encoding.UTF8, "application/json");
        var response = await GetClient().PatchAsync(url, updateDataElementContent);
        var responseString = await response.Content.ReadAsStringAsync();
        using var responseParsedRaw = JsonDocument.Parse(responseString);
        OutputHelper.WriteLine("\nResponse:");
        OutputHelper.WriteLine(JsonSerializer.Serialize(responseParsedRaw, _jsonSerializerOptions));
        response.Should().HaveStatusCode(expectedStatus);
        var responseObject = JsonSerializer.Deserialize<TResponse>(responseString, _jsonSerializerOptions)!;
        return (response, responseString, responseObject);
    }

    [Fact]
    public async Task ValidName_ReturnsOk()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        // Update data element
        var patch = new JsonPatch(
            PatchOperation.Replace(JsonPointer.Create("melding", "name"), JsonNode.Parse("\"Ola Olsen\""))
        );

        var (_, _, parsedResponse) = await CallPatchApi<DataPatchResponse>(patch, null, HttpStatusCode.OK);

        parsedResponse.ValidationIssues.Should().ContainKey("Required").WhoseValue.Should().BeEmpty();

        var newModelElement = parsedResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var newModel = newModelElement.Deserialize<Skjema>()!;
        newModel.Melding!.Name.Should().Be("Ola Olsen");

        _dataProcessorMock.Verify(
            p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.Is<Guid>(dataId => dataId == _dataGuid),
                    It.IsAny<Skjema>(),
                    It.IsAny<Skjema?>(),
                    null
                ),
            Times.Exactly(1)
        );
        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task MultiplePatches_AppliesCorrectly()
    {
        const string prefillDataType = "prefill-data-type";
        OverrideServicesForThisTest = (services) =>
        {
            services.AddSingleton(
                new AppMetadataMutationHook(
                    (app) =>
                    {
                        app.DataTypes.Add(
                            new DataType()
                            {
                                Id = prefillDataType,
                                AllowedContentTypes = new List<string> { "application/json" },
                                AppLogic = new()
                                {
                                    ClassRef =
                                        "Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models.Skjema",
                                },
                            }
                        );
                    }
                )
            );
        };
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(Task.CompletedTask)
            .Verifiable(Times.Exactly(2));

        // Initialize extra data element
        using var content = new StringContent("""{"melding":{}}""", Encoding.UTF8, "application/json");
        var createExtraElementResponse = await GetClient()
            .PostAsync($"{Org}/{App}/instances/{_instanceId}/data?dataType={prefillDataType}", content);
        var createExtraElementResponseString = await createExtraElementResponse.Content.ReadAsStringAsync();
        OutputHelper.WriteLine(createExtraElementResponseString);
        createExtraElementResponse.Should().HaveStatusCode(HttpStatusCode.Created);
        var extraDataId = JsonSerializer
            .Deserialize<DataElement>(createExtraElementResponseString, _jsonSerializerOptions)
            ?.Id;
        extraDataId.Should().NotBeNull();
        var extraDataGuid = Guid.Parse(extraDataId!);

        // Update data element
        var patch = new JsonPatch(
            PatchOperation.Replace(JsonPointer.Create("melding", "name"), JsonNode.Parse("\"Ola Olsen\""))
        );
        var patch2 = new JsonPatch(
            PatchOperation.Replace(JsonPointer.Create("melding", "name"), JsonNode.Parse("\"Kari Olsen\""))
        );
        var request = new DataPatchRequestMultiple()
        {
            Patches = new() { new(_dataGuid, patch), new(extraDataGuid, patch2) },
            IgnoredValidators = [],
        };

        var (_, _, parsedResponse) = await CallPatchMultipleApi<DataPatchResponseMultiple>(request, HttpStatusCode.OK);

        parsedResponse
            .ValidationIssues.Should()
            .ContainSingle(p => p.Source == "Required")
            .Which.Issues.Should()
            .BeEmpty();
        parsedResponse.Instance.Data.Should().ContainSingle(d => d.DataType == prefillDataType);

        parsedResponse.NewDataModels.Should().HaveCount(2);
        var newData = parsedResponse
            .NewDataModels.Should()
            .ContainSingle(d => d.DataElementId == _dataGuid)
            .Which.Data.Should()
            .BeOfType<JsonElement>()
            .Which.Deserialize<Skjema>()!;
        newData.Melding!.Name.Should().Be("Ola Olsen");

        var newExtraData = parsedResponse
            .NewDataModels.Should()
            .ContainSingle(d => d.DataElementId == extraDataGuid)
            .Which.Data.Should()
            .BeOfType<JsonElement>()
            .Which.Deserialize<Skjema>()!;
        newExtraData.Melding!.Name.Should().Be("Kari Olsen");

        _dataProcessorMock.Verify();
    }

    [Fact]
    public async Task NullName_ReturnsOkAndValidationError()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );
        // Update data element
        var patch = new JsonPatch(
            PatchOperation.Test(JsonPointer.Create("melding", "name"), JsonNode.Parse("null")),
            PatchOperation.Replace(JsonPointer.Create("melding", "name"), JsonNode.Parse("null"))
        );

        var (_, _, parsedResponse) = await CallPatchApi<DataPatchResponse>(patch, null, HttpStatusCode.OK);

        var newModelElement = parsedResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var newModel = newModelElement.Deserialize<Skjema>()!;
        newModel.Melding!.Name.Should().BeNull();

        var requiredList = parsedResponse.ValidationIssues.Should().ContainKey("Required").WhoseValue;
        var requiredName = requiredList.Should().ContainSingle().Which;
        requiredName.Field.Should().Be("melding.name");
        requiredName
            .Description.Should()
            .Be("melding.name is required in component with id default.page.name for binding simpleBinding");

        // Run full validation to see that result is the same
        using var client = GetRootedUserClient(Org, App, UserId, InstanceOwnerPartyId);
        var validationResponse = await client.GetAsync($"/{Org}/{App}/instances/{_instanceId}/validate");
        validationResponse.Should().HaveStatusCode(HttpStatusCode.OK);
        var validationResponseString = await validationResponse.Content.ReadAsStringAsync();
        var validationResponseObject = JsonSerializer.Deserialize<List<ValidationIssueWithSource>>(
            validationResponseString,
            _jsonSerializerOptions
        )!;
        validationResponseObject.Should().BeEquivalentTo(parsedResponse.ValidationIssues.Values.SelectMany(d => d));

        _dataProcessorMock.Verify(
            p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.Is<Guid>(dataId => dataId == _dataGuid),
                    It.IsAny<Skjema>(),
                    It.IsAny<Skjema?>(),
                    null
                ),
            Times.Exactly(1)
        );
        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task InvalidTestValue_ReturnsConflict()
    {
        this.OverrideServicesForThisTest = (services) =>
        {
            services.AddTelemetrySink(
                additionalActivitySources: source => source.Name == "Microsoft.AspNetCore",
                additionalMeters: source => source.Name == "Microsoft.AspNetCore.Hosting",
                filterMetrics: metric => metric.Name == "http.server.request.duration"
            );
        };

        // Update data element
        var patch = new JsonPatch(
            PatchOperation.Test(
                JsonPointer.Create("melding", "name"),
                JsonNode.Parse("\"Not correct previous value\"")
            ),
            PatchOperation.Replace(JsonPointer.Create("melding", "name"), JsonNode.Parse("null"))
        );

        var (_, _, parsedResponse) = await CallPatchApi<ProblemDetails>(patch, null, HttpStatusCode.Conflict);
        var telemetry = this.Services.GetRequiredService<TelemetrySink>();

        parsedResponse.Detail.Should().Be("Path `/melding/name` is not equal to the indicated value.");

        _dataProcessorMock.VerifyNoOtherCalls();

        await telemetry.WaitForServerTelemetry();
        await Verify(telemetry.GetSnapshot());
    }

    [Fact]
    public async Task InvalidTestPath_ReturnsPreconditionFailed()
    {
        // Update data element
        var patch = new JsonPatch(
            PatchOperation.Test(JsonPointer.Create("melding", "name-error"), JsonNode.Parse("null")),
            PatchOperation.Replace(JsonPointer.Create("melding", "name"), JsonNode.Parse("null"))
        );

        var (_, _, parsedResponse) = await CallPatchApi<ProblemDetails>(
            patch,
            null,
            HttpStatusCode.UnprocessableContent
        );

        parsedResponse.Detail.Should().Be("Path `/melding/name-error` could not be reached.");

        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task InvalidJsonPointer_ReturnsUnprocessableContent()
    {
        // Update data element
        var pointer = JsonPointer.Create("not", "a pointer");
        var patch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("null")),
            PatchOperation.Replace(pointer, JsonNode.Parse("\"Ivar\""))
        );

        var (_, _, parsedResponse) = await CallPatchApi<ProblemDetails>(
            patch,
            null,
            HttpStatusCode.UnprocessableContent
        );

        parsedResponse.Detail.Should().Be("Path `/not/a pointer` could not be reached.");

        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task TestEmptyListAndInsertElement_ReturnsNewModel()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        // Update data element
        var pointer = JsonPointer.Create("melding", "nested_list");
        var patch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("""[]""")),
            PatchOperation.Add(pointer, JsonNode.Parse("""[{"key": "newKey"}]"""))
        );

        var (_, _, parsedResponse) = await CallPatchApi<DataPatchResponse>(patch, null, HttpStatusCode.OK);

        var newModel = parsedResponse.NewDataModel.Should().BeOfType<JsonElement>().Which.Deserialize<Skjema>()!;
        var listItem = newModel.Melding!.NestedList.Should().ContainSingle().Which;
        listItem.Key.Should().Be("newKey");

        parsedResponse
            .ValidationIssues.Should()
            .ContainKey("Required")
            .WhoseValue.Should()
            .Contain(i => i.Field == "melding.name");

        _dataProcessorMock.Verify(
            p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.Is<Guid>(dataId => dataId == _dataGuid),
                    It.Is<Skjema>(s => s.Melding!.NestedList!.Count == 1),
                    It.Is<Skjema?>(s => s!.Melding!.NestedList!.Count == 0),
                    null
                ),
            Times.Exactly(1)
        );
        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task AddItemToNonInitializedList_ReturnsUnprocessableEntity()
    {
        // This test fails to initialize the list, thus creating an error
        // Added this test to ensure that a change in behaviour (when changing json patch library)
        // is detected
        var pointer = JsonPointer.Create("melding", "nested_list", 0, "newKey");
        var patch = new JsonPatch(PatchOperation.Add(pointer, JsonNode.Parse("\"newValue\"")));

        var (_, _, parsedResponse) = await CallPatchApi<ProblemDetails>(
            patch,
            null,
            HttpStatusCode.UnprocessableContent
        );

        parsedResponse.Detail.Should().Contain("/melding/nested_list/0/newKey");

        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task InsertNonExistingFieldWithoutTest_ReturnsUnprocessableContent()
    {
        // Update data element
        var pointer = JsonPointer.Create("melding", "non_existing_field");
        var patch = new JsonPatch(PatchOperation.Add(pointer, JsonNode.Parse("""[{"key": "newKey"}]""")));

        var (_, _, parsedResponse) = await CallPatchApi<ProblemDetails>(
            patch,
            null,
            HttpStatusCode.UnprocessableContent
        );

        parsedResponse
            .Detail.Should()
            .Contain("The JSON property 'non_existing_field' could not be mapped to any .NET member contained in type");

        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task SetXmlTextPropertyToEmtpy_ReturnsCorrectDataModel()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        var pointer = JsonPointer.Create("melding", "tag-with-attribute");
        var createFirstElementPatch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("null")),
            PatchOperation.Add(pointer, JsonNode.Parse("""{"value": "" }"""))
        );

        var (_, _, firstResponse) = await CallPatchApi<DataPatchResponse>(
            createFirstElementPatch,
            null,
            HttpStatusCode.OK
        );

        var firstData = firstResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var emptyValue = firstData.GetProperty("melding").GetProperty("tag-with-attribute");
        emptyValue.ValueKind.Should().Be(JsonValueKind.Null);

        var addValuePatch = new JsonPatch(
            PatchOperation.Test(pointer, emptyValue.AsNode()),
            PatchOperation.Replace(pointer, JsonNode.Parse("""{"value": "mySecondValue" }"""))
        );
        var (_, _, secondResponse) = await CallPatchApi<DataPatchResponse>(addValuePatch, null, HttpStatusCode.OK);
        var secondData = secondResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var secondValue = secondData.GetProperty("melding").GetProperty("tag-with-attribute").GetProperty("value");
        secondValue.GetString().Should().Be("mySecondValue");
    }

    [Fact]
    public async Task UpdateContainerWithListProperty_ReturnsCorrectDataModel()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        var pointer = JsonPointer.Create("melding", "nested_list");
        var createFirstElementPatch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("[]")),
            PatchOperation.Add(pointer.Combine("-"), JsonNode.Parse("""{"key": "myKey" }"""))
        );

        var (_, _, firstResponse) = await CallPatchApi<DataPatchResponse>(
            createFirstElementPatch,
            null,
            HttpStatusCode.OK
        );

        var firstData = firstResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var firstListItem = firstData.GetProperty("melding").GetProperty("nested_list").EnumerateArray().First();
        firstListItem.GetProperty("values").GetArrayLength().Should().Be(0);

        var addValuePatch = new JsonPatch(
            PatchOperation.Test(pointer.Combine("0"), firstListItem.AsNode()),
            PatchOperation.Remove(pointer.Combine("0"))
        );
        var (_, _, secondResponse) = await CallPatchApi<DataPatchResponse>(addValuePatch, null, HttpStatusCode.OK);
        var secondData = secondResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        secondData.GetProperty("melding").GetProperty("nested_list").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task RemoveStringProperty_ReturnsCorrectDataModel()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        var pointer = JsonPointer.Create("melding", "name");
        var createFirstElementPatch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("null")),
            PatchOperation.Add(pointer, JsonNode.Parse("\"myValue\"")),
            PatchOperation.Remove(pointer)
        );

        var (_, _, firstResponse) = await CallPatchApi<DataPatchResponse>(
            createFirstElementPatch,
            null,
            HttpStatusCode.OK
        );

        var firstData = firstResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var firstListItem = firstData.GetProperty("melding").GetProperty("name");
        firstListItem.ValueKind.Should().Be(JsonValueKind.Null);

        var addValuePatch = new JsonPatch(
            PatchOperation.Test(pointer, firstListItem.AsNode()),
            PatchOperation.Replace(pointer, JsonNode.Parse("\"mySecondValue\""))
        );
        var (_, _, secondResponse) = await CallPatchApi<DataPatchResponse>(addValuePatch, null, HttpStatusCode.OK);
        var secondData = secondResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var secondValue = secondData.GetProperty("melding").GetProperty("name");
        secondValue.GetString().Should().Be("mySecondValue");
    }

    [Fact]
    public async Task SetStringPropertyToEmpty_ReturnsCorrectDataModel()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        var pointer = JsonPointer.Create("melding", "name");
        var createFirstElementPatch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("null")),
            PatchOperation.Add(pointer, JsonNode.Parse("\"\""))
        );

        var (_, _, firstResponse) = await CallPatchApi<DataPatchResponse>(
            createFirstElementPatch,
            null,
            HttpStatusCode.OK
        );

        var firstData = firstResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var firstListItem = firstData.GetProperty("melding").GetProperty("name");
        firstListItem.ValueKind.Should().Be(JsonValueKind.String);
        firstListItem.GetString().Should().BeEmpty();

        var addValuePatch = new JsonPatch(
            PatchOperation.Test(pointer, firstListItem.AsNode()),
            PatchOperation.Replace(pointer, JsonNode.Parse("\"mySecondValue\""))
        );
        var (_, _, secondResponse) = await CallPatchApi<DataPatchResponse>(addValuePatch, null, HttpStatusCode.OK);
        var secondData = secondResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var secondValue = secondData.GetProperty("melding").GetProperty("name");
        secondValue.GetString().Should().Be("mySecondValue");
    }

    [Fact]
    public async Task SetAttributeTagPropertyToEmpty_ReturnsCorrectDataModel()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        var pointer = JsonPointer.Create("melding", "tag-with-attribute");
        var createFirstElementPatch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("null")),
            PatchOperation.Add(pointer, JsonNode.Parse("""{"value": "test" }"""))
        );

        var (_, _, firstResponse) = await CallPatchApi<DataPatchResponse>(
            createFirstElementPatch,
            null,
            HttpStatusCode.OK
        );

        var firstData = firstResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var firstListItem = firstData.GetProperty("melding").GetProperty("tag-with-attribute").GetProperty("value");
        firstListItem.ValueKind.Should().Be(JsonValueKind.String);
        firstListItem.GetString().Should().Be("test");

        var addValuePatch = new JsonPatch(
            PatchOperation.Test(pointer, JsonNode.Parse("""{"orid":34730,"value":"test"}""")),
            PatchOperation.Add(pointer.Combine("value"), JsonNode.Parse("\"\""))
        );
        var (_, _, secondResponse) = await CallPatchApi<DataPatchResponse>(addValuePatch, null, HttpStatusCode.OK);
        var secondData = secondResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var secondValue = secondData.GetProperty("melding").GetProperty("tag-with-attribute");
        secondValue.ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task RowId_GetsAddedAutomatically()
    {
        var rowIdServer = Guid.NewGuid();
        var rowIdClient = Guid.NewGuid();
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object data, object? existingData, string language) =>
                {
                    var model = (Skjema)data;
                    model.Melding ??= new();
                    model.Melding.SimpleList ??= new();
                    model.Melding.SimpleList.SimpleKeyvalues ??= new();
                    model.Melding.SimpleList.SimpleKeyvalues.Add(
                        new SimpleKeyvalues()
                        {
                            Key = "KeyFromServer",
                            IntValue = 321,
                            AltinnRowId = rowIdServer,
                        }
                    );
                    model.Melding.SimpleList.SimpleKeyvalues.Add(
                        new SimpleKeyvalues() { Key = "KeyFromServerWithoutRowId", IntValue = 3212 }
                    );
                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Once);
        var patch = new JsonPatch(
            PatchOperation.Add(
                JsonPointer.Create("melding", "simple_list"),
                JsonNode.Parse(
                    $$"""
                    {
                        "simple_keyvalues":[
                            {
                               "key": "KeyFromClient",
                               "intValue": 123,
                               "altinnRowId": "{{rowIdClient}}"
                             },
                             {
                                  "key": "KeyFromClientNoRowId",
                                  "intValue": 1234
                             }
                       ]
                    }
                    """
                )
            )
        );

        var (_, _, parsedResponse) = await CallPatchApi<DataPatchResponse>(patch, null, HttpStatusCode.OK);

        var newModelElement = parsedResponse.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var newModel = newModelElement.Deserialize<Skjema>()!;
        newModel
            .Melding!.SimpleList!.SimpleKeyvalues.Should()
            .BeEquivalentTo(
                new List<SimpleKeyvalues>
                {
                    new()
                    {
                        Key = "KeyFromClient",
                        IntValue = 123,
                        AltinnRowId = rowIdClient,
                    },
                    new()
                    {
                        Key = "KeyFromClientNoRowId",
                        IntValue = 1234,
                        AltinnRowId = newModel.Melding.SimpleList.SimpleKeyvalues![1].AltinnRowId,
                    },
                    new()
                    {
                        Key = "KeyFromServer",
                        IntValue = 321,
                        AltinnRowId = rowIdServer,
                    },
                    new()
                    {
                        Key = "KeyFromServerWithoutRowId",
                        IntValue = 3212,
                        AltinnRowId = newModel.Melding.SimpleList.SimpleKeyvalues![3].AltinnRowId,
                    },
                }
            );

        _dataProcessorMock.Verify();
    }

    [Fact]
    public async Task DataReadChanges_IsPreservedWhenCallingPatch()
    {
        _dataProcessorMock
            .Setup(p => p.ProcessDataRead(It.IsAny<Instance>(), It.IsAny<Guid>(), It.IsAny<Skjema>(), LanguageConst.Nn))
            .Returns(
                (Instance instance, Guid dataGuid, Skjema skjema, string language) =>
                {
                    skjema.Melding!.Random = "randomFromDataRead";
                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Exactly(1));
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object data, object? previousData, string language) =>
                    Task.CompletedTask
            )
            .Verifiable(Times.Exactly(1));

        // call Read to get the data with changes to Melding.Random from ProcessDataRead
        var url = $"/{Org}/{App}/instances/{_instanceId}/data/{_dataGuid}?language=nn";
        OutputHelper.WriteLine($"Calling GET {url}");
        using var httpClient = GetRootedClient(Org, App);
        string token = TestAuthentication.GetUserToken(userId: UserId, InstanceOwnerPartyId);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            AuthorizationSchemes.Bearer,
            token
        );
        var response = await httpClient.GetAsync(url);
        var responseString = await response.Content.ReadAsStringAsync();
        using var responseParsedRaw = JsonDocument.Parse(responseString);
        OutputHelper.WriteLine("\nResponse:");
        OutputHelper.WriteLine(JsonSerializer.Serialize(responseParsedRaw, _jsonSerializerOptions));
        response.Should().HaveStatusCode(HttpStatusCode.OK);
        var responseObject = JsonSerializer.Deserialize<Skjema>(responseString, _jsonSerializerOptions)!;

        responseObject.Melding!.Random.Should().Be("randomFromDataRead");

        // Run a patch operation
        var patch = new JsonPatch(
            PatchOperation.Test(JsonPointer.Create("melding", "name"), JsonNode.Parse("null")),
            PatchOperation.Replace(JsonPointer.Create("melding", "name"), JsonNode.Parse("\"Ola Olsen\""))
        );
        var (_, _, parsedResponsePatch) = await CallPatchApi<DataPatchResponse>(patch, null, HttpStatusCode.OK);

        // Verify that the patch operation preserves the changes made by ProcessDataRead
        var newModelElement = parsedResponsePatch.NewDataModel.Should().BeOfType<JsonElement>().Which;
        var newModel = newModelElement.Deserialize<Skjema>()!;
        newModel.Melding!.Random.Should().Be("randomFromDataRead");

        _dataProcessorMock.Verify();
    }

    [Fact]
    public async Task VerifyLanguageIsPassedToDataProcessor()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    "es"
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        // Update data element with language set to "es"
        var patch = new JsonPatch(
            PatchOperation.Replace(JsonPointer.Create("melding", "name"), JsonNode.Parse("\"Ola Olsen\""))
        );

        await CallPatchApi<DataPatchResponse>(patch, null, HttpStatusCode.OK, language: "es");

        _dataProcessorMock.Verify(
            p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.Is<Guid>(dataId => dataId == _dataGuid),
                    It.IsAny<Skjema>(),
                    It.IsAny<Skjema?>(),
                    "es"
                ),
            Times.Exactly(1)
        );
        _dataProcessorMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task ValidationIssueSeverity_IsSerializedNumeric()
    {
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string language) =>
                    Task.CompletedTask
            );

        var patch = new JsonPatch();
        var (_, responseString, _) = await CallPatchApi<DataPatchResponse>(patch, null, HttpStatusCode.OK);

        responseString.Should().Contain("\"severity\":1");
    }

    [Fact]
    public async Task IgnoredValidators_NotExecuted()
    {
        // Common setup
        _dataProcessorMock
            .Setup(p =>
                p.ProcessDataWrite(
                    It.IsAny<Instance>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<object>(),
                    It.IsAny<object?>(),
                    null
                )
            )
            .Returns(
                (Instance instance, Guid? dataGuid, object skjema, object? existingData, string? language) =>
                    Task.CompletedTask
            )
            .Verifiable(Times.Exactly(2));

        // Add extra validator that should be ignored
        _formDataValidatorMock
            .Setup(fdv =>
                fdv.ValidateFormData(
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>(),
                    It.IsAny<object>(),
                    It.IsAny<string?>()
                )
            )
            .ReturnsAsync(
                new List<ValidationIssue>
                {
                    new() { Severity = ValidationIssueSeverity.Error, Description = "Ignored validator" },
                }
            )
            .Verifiable(Times.Once);
        _formDataValidatorMock.SetupGet(fdv => fdv.ValidationSource).Returns("ignored");
        _formDataValidatorMock.SetupGet(fdv => fdv.DataType).Returns("default");
        _formDataValidatorMock.SetupGet(fdv => fdv.NoIncrementalValidation).Returns(false);
        _formDataValidatorMock
            .Setup(fdv => fdv.HasRelevantChanges(It.IsAny<object>(), It.IsAny<object>()))
            .Returns(true);

        var path = JsonPointer.Create("melding", "name");
        var patch = new JsonPatch(PatchOperation.Replace(path, JsonNode.Parse("\"Ola Olsen\"")));

        var (_, _, parsedResponse1) = await CallPatchApi<DataPatchResponse>(patch, ["ignored"], HttpStatusCode.OK);

        // Verify that no issues from the ignored validator are present
        parsedResponse1.ValidationIssues.Should().NotContainKey("ignored");

        var patch2 = new JsonPatch(
            PatchOperation.Test(path, JsonNode.Parse("\"Ola Olsen\"")),
            PatchOperation.Replace(path, JsonNode.Parse("\"Ola Nielsen\""))
        );

        var (_, _, parsedResponse2) = await CallPatchApi<DataPatchResponse>(patch2, null, HttpStatusCode.OK);

        // Verify that issues from the ignored validator are present
        parsedResponse2
            .ValidationIssues.Should()
            .ContainKey("ignored")
            .WhoseValue.Should()
            .ContainSingle()
            .Which.Description.Should()
            .Be("Ignored validator");

        _dataProcessorMock.Verify();
        _formDataValidatorMock.Verify();
    }

    [Fact]
    public async Task RunPatch_DeleteElementInDataProcessor_ReturnsUpdatedInstance()
    {
        var dataWriteProcessorMock = new Mock<IDataWriteProcessor>(MockBehavior.Strict);

        dataWriteProcessorMock
            .Setup(d =>
                d.ProcessDataWrite(It.IsAny<IInstanceDataMutator>(), "Task_1", It.IsAny<DataElementChanges>(), null)
            )
            .Returns(
                (IInstanceDataMutator dataMutator, string taskId, DataElementChanges changes, string? language) =>
                {
                    dataMutator.RemoveDataElement(new DataElementIdentifier(_dataGuid));
                    dataMutator.RemoveDataElement(new DataElementIdentifier(_binaryDataGuid));
                    return Task.CompletedTask;
                }
            )
            .Verifiable(Times.Once);

        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IDataProcessor>();
            services.AddSingleton(dataWriteProcessorMock.Object);
        };

        var patch = new DataPatchRequestMultiple()
        {
            IgnoredValidators = [],
            Patches =
            [
                // new DataPatchRequestMultiple.PatchListItem(_dataGuid,
                //     new JsonPatch(PatchOperation.Replace(path, JsonNode.Parse("\"Ola Olsen\""))))
            ],
        };

        var (_, _, parsedResponse) = await CallPatchMultipleApi<DataPatchResponseMultiple>(patch, HttpStatusCode.OK);

        parsedResponse.Instance.Data.Should().BeEmpty();
    }

    [Fact]
    public async Task RunPatch_MutateDataInValidator_Errors()
    {
        OverrideEnvironment = "Development";
        OverrideServicesForThisTest = services =>
        {
            services.RemoveAll<IDataProcessor>();
        };
        _formDataValidatorMock.SetupGet(fdv => fdv.DataType).Returns("default");
        _formDataValidatorMock
            .Setup(fdv => fdv.HasRelevantChanges(It.IsAny<object>(), It.IsAny<object>()))
            .Returns(true);
        _formDataValidatorMock.SetupGet(fdv => fdv.NoIncrementalValidation).Returns(false);
        _formDataValidatorMock
            .Setup(v => v.ValidateFormData(It.IsAny<Instance>(), It.IsAny<DataElement>(), It.IsAny<object>(), "nb"))
            .ReturnsAsync(
                (Instance _instanceGuid, DataElement dataElement, object data, string? language) =>
                {
                    if (data is Skjema skjema)
                    {
                        skjema.Melding ??= new();
                        skjema.Melding.Name = "InvalidChangeInValidator";
                    }
                    return new List<ValidationIssue>();
                }
            )
            .Verifiable(Times.Once);

        var path = JsonPointer.Create("melding", "name");
        var patch = new DataPatchRequestMultiple()
        {
            IgnoredValidators = [],
            Patches =
            [
                new DataPatchRequestMultiple.PatchListItem(
                    _dataGuid,
                    new JsonPatch(PatchOperation.Test(path, JsonNode.Parse("null")))
                ),
            ],
        };

        var url = $"/{Org}/{App}/instances/{_instanceId}/data?language=nb";

        var action = async () =>
        {
            using var updateDataElementContent = JsonContent.Create(patch);
            await GetClient().PatchAsync(url, updateDataElementContent);
        };
        // Not sure why the exception propagates out of the api call in WebApplicationFactory.
        (await action.Should().ThrowAsync<Exception>())
            .Which.Message.Should()
            .Contain("changed by validators");
    }

    ~DataControllerPatchTests()
    {
        _client?.Dispose();
    }
}
