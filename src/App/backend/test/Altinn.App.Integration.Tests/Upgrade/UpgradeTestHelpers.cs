using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using Altinn.App.Api.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Json.Patch;
using Json.Pointer;

namespace Altinn.App.Integration.Tests.Upgrade;

/// <summary>
/// Steps the upgrade tests share. They only use API calls that v8 and v9 apps both answer, so the same helper works
/// on either side of <see cref="AppFixture.UpgradeTo"/>.
/// </summary>
internal static class UpgradeTestHelpers
{
    public static async Task AssertLibraryMajorVersion(AppFixture fixture, int expectedMajor)
    {
        using var response = await fixture.ApplicationMetadata.Get();
        using var metadata = await response.Read<ApplicationMetadata>();
        Assert.Equal(HttpStatusCode.OK, metadata.Response.StatusCode);
        Assert.StartsWith($"{expectedMajor}.", metadata.Data.Model?.AltinnNugetVersion);
    }

    public static async Task<AppFixture.ReadApiResponse<Instance>> Instantiate(
        AppFixture fixture,
        string token,
        string partyId
    )
    {
        using var response = await fixture.Instances.PostSimplified(
            token,
            new InstantiationInstance { InstanceOwner = new InstanceOwner { PartyId = partyId } }
        );
        var instance = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.Created, instance.Response.StatusCode);
        Assert.NotNull(instance.Data.Model);
        return instance;
    }

    /// <summary>
    /// Sets one property of the instance's form data element of <paramref name="dataType"/>. The value is any JSON,
    /// so lists and objects can be set in one go. The element is looked up on the current instance, since data
    /// elements are created when their task starts.
    /// </summary>
    public static async Task SetFormValue(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance,
        string dataType,
        string property,
        JsonNode? value
    )
    {
        Instance current = await GetInstance(fixture, token, instance);
        Guid dataElementId = Guid.Parse(current.Data.Single(d => d.DataType == dataType).Id);
        using var response = await fixture.Instances.PatchFormData(
            token,
            instance,
            new DataPatchRequestMultiple
            {
                Patches = [new(dataElementId, new JsonPatch(PatchOperation.Add(JsonPointer.Create(property), value)))],
                IgnoredValidators = null,
            }
        );
        Assert.Equal(HttpStatusCode.OK, response.Response.StatusCode);
    }

    public static async Task AssertProcessNext(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance,
        string? action,
        string? expectedTask
    )
    {
        using var response = await fixture.Instances.ProcessNext(
            token,
            instance,
            action is null ? null : new ProcessNext { Action = action }
        );
        using var processState = await response.Read<AppProcessState>();
        Assert.True(
            processState.Response.StatusCode == HttpStatusCode.OK,
            $"process/next ({action ?? "no action"}) returned {(int)processState.Response.StatusCode}: {processState.Data.Body}"
        );
        Assert.Equal(expectedTask, processState.Data.Model?.CurrentTask?.ElementId);
        if (expectedTask is null)
            Assert.NotNull(processState.Data.Model?.Ended);
    }

    public static async Task AssertAction(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance,
        string action
    )
    {
        using var response = await fixture.Instances.PerformAction(token, instance, action);
        using var read = await response.Read<string>();
        Assert.True(
            read.Response.StatusCode == HttpStatusCode.OK,
            $"action {action} returned {(int)read.Response.StatusCode}: {read.Data.Body}"
        );
    }

    public static async Task<Instance> GetInstance(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var response = await fixture.Instances.Get(token, instance);
        using var read = await response.Read<Instance>();
        Assert.Equal(HttpStatusCode.OK, read.Response.StatusCode);
        return read.Data.Model!;
    }

    /// <summary>
    /// The data elements as Storage has them. Apps leave some data types out of the instance they return, for example
    /// signatures and signee states.
    /// </summary>
    public static async Task<List<DataElement>> GetStorageDataElements(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance
    )
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/storage/api/v1/instances/{instance.Data.Model!.Id}/dataelements"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await fixture.GetLocaltestClient().SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var dataElements = await JsonSerializer.DeserializeAsync<DataElementList>(
            await response.Content.ReadAsStreamAsync(),
            new JsonSerializerOptions(JsonSerializerDefaults.Web)
        );
        return dataElements?.DataElements ?? [];
    }

    public static async Task<JsonNode> GetFormData(
        AppFixture fixture,
        string token,
        AppFixture.ReadApiResponse<Instance> instance,
        string dataType
    )
    {
        Instance instanceModel = await GetInstance(fixture, token, instance);
        string dataElementId = instanceModel.Data.Single(d => d.DataType == dataType).Id;
        using var request = new HttpRequestMessage(
            HttpMethod.Get,
            $"/ttd/{fixture.EffectiveApp}/instances/{instanceModel.Id}/data/{dataElementId}"
        );
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        using var response = await fixture.GetAppClient().SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
    }

    public static string? GeneratedFromTask(DataElement dataElement) =>
        dataElement
            .References?.SingleOrDefault(r =>
                r.Relation == RelationType.GeneratedFrom && r.ValueType == ReferenceType.Task
            )
            ?.Value;
}
