using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using UglyToad.PdfPig;
using UglyToad.PdfPig.DocumentLayoutAnalysis.TextExtractor;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.WorkflowEngine;

[Trait("Category", "Integration")]
[Collection(WorkflowEngineTestCollection.Name)]
public class WorkflowEngineSubformPdfTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private const int UserId = 91337;
    private const string OwnerPartyId = "951337";

    [Fact]
    public async Task SubformPreview_RendersSelectedElementWithSameContentAsServiceTask()
    {
        await using var fixtureScope = await classFixture.Get(
            output,
            TestApps.Basic,
            scenario: "workflow-engine-subform-pdf"
        );
        var fixture = fixtureScope.Fixture;
        string token = await fixture.Auth.GetUserToken(userId: UserId);

        using var creationResponse = await fixture.Instances.PostMultipart(
            token,
            instanceTemplate: new Instance { InstanceOwner = new InstanceOwner { PartyId = OwnerPartyId } },
            dataParts: new Dictionary<string, (string, string)>
            {
                ["model"] = ("""{"property1":"ParentOnlyValue","property2":"ParentOnlyDetail"}""", "application/json"),
            }
        );
        using var created = await creationResponse.Read<Instance>();
        Assert.True(
            created.Response.StatusCode == HttpStatusCode.Created,
            $"Instantiation failed: {created.Data.Body}"
        );
        Instance instance = Assert.IsType<Instance>(created.Data.Model);

        Guid selectedId = await AddSubform(fixture, token, instance.Id, "SelectedSubformAlpha", "SelectedDetailGamma");
        Guid otherId = await AddSubform(fixture, token, instance.Id, "OtherSubformBeta", "OtherDetailDelta");

        using var savedResponse = await fixture.Instances.Get(token, created);
        using var saved = await savedResponse.Read<Instance>();
        Instance savedInstance = Assert.IsType<Instance>(saved.Data.Model);
        string[] dataIds = savedInstance.Data.Select(element => element.Id).Order().ToArray();
        string[] savedFormData = await Task.WhenAll(
            dataIds.Select(id => ReadFormData(fixture, token, instance.Id, id))
        );

        using var previewResponse = await fixture.Generic.Get(
            $"/ttd/basic/instances/{instance.Id}/data/{selectedId}/pdf/preview?language=nb",
            token
        );
        string previewText = await ReadPdfText(previewResponse);
        AssertSubformContent(previewText, "SelectedSubformAlpha", "SelectedDetailGamma", "OtherSubformBeta");

        using var beforeNextResponse = await fixture.Instances.Get(token, created);
        using var beforeNext = await beforeNextResponse.Read<Instance>();
        Assert.Equal("Task_1", beforeNext.Data.Model!.Process.CurrentTask.ElementId);
        Assert.DoesNotContain(beforeNext.Data.Model.Data, element => element.DataType == "ref-data-as-pdf");
        Assert.Equal(dataIds, beforeNext.Data.Model.Data.Select(element => element.Id).Order());
        Assert.Equal(
            JsonSerializer.Serialize(savedInstance.Process),
            JsonSerializer.Serialize(beforeNext.Data.Model.Process)
        );
        string[] afterPreviewFormData = await Task.WhenAll(
            dataIds.Select(id => ReadFormData(fixture, token, instance.Id, id))
        );
        Assert.Equal(savedFormData, afterPreviewFormData);

        using var nextResponse = await fixture.Instances.ProcessNext(token, beforeNext);
        using var processState = await nextResponse.Read<AppProcessState>();
        Assert.Equal(HttpStatusCode.OK, processState.Response.StatusCode);
        Assert.Equal("EndEvent_1", processState.Data.Model!.EndEvent);

        using var completedResponse = await fixture.Instances.Get(token, created);
        using var completed = await completedResponse.Read<Instance>();
        List<DataElement> generated = completed.Data.Model!.Data.Where(d => d.DataType == "ref-data-as-pdf").ToList();
        Assert.Equal(2, generated.Count);

        DataElement selectedPdf = FindSubformPdf(generated, selectedId);
        using var selectedResponse = await fixture.Generic.Get(
            $"/ttd/basic/instances/{instance.Id}/data/{selectedPdf.Id}",
            token
        );
        string selectedText = await ReadPdfText(selectedResponse);
        AssertSubformContent(selectedText, "SelectedSubformAlpha", "SelectedDetailGamma", "OtherSubformBeta");
        // Preview and production intentionally have different footers; compare the entire custom layout body.
        Assert.Equal(ExtractBody(previewText), ExtractBody(selectedText));

        DataElement otherPdf = FindSubformPdf(generated, otherId);
        using var otherResponse = await fixture.Generic.Get(
            $"/ttd/basic/instances/{instance.Id}/data/{otherPdf.Id}",
            token
        );
        string otherText = await ReadPdfText(otherResponse);
        AssertSubformContent(otherText, "OtherSubformBeta", "OtherDetailDelta", "SelectedSubformAlpha");
    }

    private static async Task<Guid> AddSubform(
        AppFixture fixture,
        string token,
        string instanceId,
        string value,
        string detail
    )
    {
        using var content = JsonContent.Create(new { property1 = value, property2 = detail });
        using var response = await fixture.Generic.Post(
            $"/ttd/basic/instances/{instanceId}/data/subform",
            token,
            content
        );
        using var created = await response.Read<DataPostResponse>();
        Assert.True(created.Response.StatusCode == HttpStatusCode.OK, $"Adding subform failed: {created.Data.Body}");
        return Assert.IsType<DataPostResponse>(created.Data.Model).NewDataElementId;
    }

    private static DataElement FindSubformPdf(List<DataElement> generated, Guid subformDataElementId) =>
        Assert.Single(
            generated,
            element =>
                element.Metadata?.Any(entry =>
                    entry.Key == "subformDataElementId" && entry.Value == subformDataElementId.ToString()
                ) == true
        );

    private static async Task<string> ReadFormData(AppFixture fixture, string token, string instanceId, string dataId)
    {
        using var response = await fixture.Generic.Get($"/ttd/basic/instances/{instanceId}/data/{dataId}", token);
        Assert.True(
            response.Response.StatusCode == HttpStatusCode.OK,
            $"Reading form data failed: {await response.Response.Content.ReadAsStringAsync()}"
        );
        return await response.Response.Content.ReadAsStringAsync();
    }

    private static async Task<string> ReadPdfText(AppFixture.ApiResponse response)
    {
        Assert.True(
            response.Response.StatusCode == HttpStatusCode.OK,
            response.Response.StatusCode == HttpStatusCode.OK
                ? null
                : $"PDF request failed: {await response.Response.Content.ReadAsStringAsync()}"
        );
        Assert.Equal("application/pdf", response.Response.Content.Headers.ContentType?.MediaType);
        byte[] bytes = await response.Response.Content.ReadAsByteArrayAsync();
        using var document = PdfDocument.Open(bytes);
        Assert.NotEmpty(document.GetPages());
        string text = string.Join("\n", document.GetPages().Select(page => ContentOrderTextExtractor.GetText(page)));
        return string.Join(" ", text.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    private static void AssertSubformContent(string text, string value, string detail, string otherValue)
    {
        Assert.Contains("SubformPdfBodyStart", text);
        Assert.Contains(value, text);
        Assert.Contains(detail, text);
        Assert.Contains("SubformPdfBodyEnd", text);
        Assert.DoesNotContain(otherValue, text);
        Assert.DoesNotContain("ParentOnlyValue", text);
        Assert.DoesNotContain("ParentOnlyDetail", text);
        Assert.DoesNotContain("EntryOnlyMarker", text);
    }

    private static string ExtractBody(string text)
    {
        int start = text.IndexOf("SubformPdfBodyStart", StringComparison.Ordinal);
        int end = text.IndexOf("SubformPdfBodyEnd", StringComparison.Ordinal);
        Assert.True(start >= 0 && end > start, $"Custom PDF body markers were not found in: {text}");
        return text[start..end];
    }
}
