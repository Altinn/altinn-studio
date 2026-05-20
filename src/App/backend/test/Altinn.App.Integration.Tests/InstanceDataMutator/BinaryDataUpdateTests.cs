using System.Net.Http.Json;
using System.Text;
using Altinn.App.Api.Models;
using Altinn.Platform.Storage.Interface.Models;
using Xunit.Abstractions;

namespace Altinn.App.Integration.Tests.InstanceDataMutator;

[Trait("Category", "Integration")]
public sealed class BinaryDataUpdateTests(ITestOutputHelper output, AppFixtureClassFixture classFixture)
    : IClassFixture<AppFixtureClassFixture>
{
    private static readonly byte[] _expectedBytes = Encoding.UTF8.GetBytes("updated through IInstanceDataMutator");

    [Fact]
    public async Task UserAction_CanUpdateExistingBinaryDataThroughMutator()
    {
        await using var fixtureScope = await classFixture.Get(output, TestApps.Basic, "binary-data-update");
        var fixture = fixtureScope.Fixture;

        var token = await fixture.Auth.GetUserToken(userId: 1337);

        using var instantiationResponse = await fixture.Instances.PostSimplified(
            token,
            new InstansiationInstance { InstanceOwner = new InstanceOwner { PartyId = "501337" } }
        );
        using var readInstantiationResponse = await instantiationResponse.Read<Instance>();
        Assert.True(
            readInstantiationResponse.Response.IsSuccessStatusCode,
            readInstantiationResponse.Data.Body ?? readInstantiationResponse.Data.Exception?.ToString()
        );

        byte[] originalBytes = Encoding.UTF8.GetBytes("created");
        using var uploadResponse = await fixture.Instances.PostData(
            token,
            readInstantiationResponse,
            "attachment",
            originalBytes,
            "text/plain",
            "attachment.txt",
            useNewEndpoint: true
        );
        using var readUploadResponse = await uploadResponse.Read<DataPostResponse>();
        Assert.True(
            readUploadResponse.Response.IsSuccessStatusCode,
            readUploadResponse.Data.Body ?? readUploadResponse.Data.Exception?.ToString()
        );

        var instance = Assert.IsType<Instance>(readInstantiationResponse.Data.Model);
        int instanceOwnerPartyId = int.Parse(instance.InstanceOwner.PartyId);
        Guid instanceGuid = Guid.Parse(instance.Id.Split('/')[1]);

        using var actionResponse = await fixture.Generic.Post(
            $"/ttd/basic/instances/{instanceOwnerPartyId}/{instanceGuid}/actions",
            token,
            JsonContent.Create(
                new UserActionRequest
                {
                    Action = "update-binary-data",
                    Metadata = new Dictionary<string, string>
                    {
                        ["dataElementId"] = readUploadResponse.Data.Model!.NewDataElementId.ToString(),
                        ["newContent"] = Encoding.UTF8.GetString(_expectedBytes),
                    },
                }
            )
        );
        using var readActionResponse = await actionResponse.Read<UserActionResponse>();
        Assert.True(
            readActionResponse.Response.IsSuccessStatusCode,
            readActionResponse.Data.Body ?? readActionResponse.Data.Exception?.ToString()
        );

        DataElement actionResponseAttachment = Assert.Single(
            readActionResponse.Data.Model!.Instance.Data,
            dataElement => dataElement.DataType == "attachment"
        );
        Assert.Equal(readUploadResponse.Data.Model!.NewDataElementId.ToString(), actionResponseAttachment.Id);

        using var updatedInstanceResponse = await fixture.Instances.Get(token, readInstantiationResponse);
        using var readUpdatedInstanceResponse = await updatedInstanceResponse.Read<Instance>();
        DataElement updatedAttachment = Assert.Single(
            readUpdatedInstanceResponse.Data.Model!.Data,
            dataElement => dataElement.DataType == "attachment"
        );
        Assert.Equal(readUploadResponse.Data.Model!.NewDataElementId.ToString(), updatedAttachment.Id);

        using var download = await fixture.Instances.Download(token, readInstantiationResponse);
        var downloadedAttachment = Assert.Single(download.Data.OfType<InstanceDataDownload.Binary>());
        byte[] actualBytes = Assert.IsType<byte[]>(downloadedAttachment.Data.Data.Model);

        Assert.True(actualBytes.AsSpan().SequenceEqual(_expectedBytes));
        Assert.False(actualBytes.AsSpan().SequenceEqual(originalBytes));
    }
}
