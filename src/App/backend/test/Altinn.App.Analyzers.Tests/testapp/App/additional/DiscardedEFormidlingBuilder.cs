using System.IO;
using System.Threading.Tasks;
using Altinn.App.Core.EFormidling.Configuration;
using Altinn.App.Core.EFormidling.Extensions;
using Altinn.App.Core.EFormidling.Interface;
using Altinn.App.Core.Features;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Models.logic;

internal sealed class TestEFormidlingMetadata : IEFormidlingMetadata
{
    public Task<(string MetadataFilename, Stream Metadata)> GenerateEFormidlingMetadata(
        IInstanceDataAccessor dataAccessor
    ) => Task.FromResult<(string, Stream)>(("arkivmelding.xml", Stream.Null));
}

internal static class DiscardedEFormidlingBuilder
{
    public static void Register(IServiceCollection services)
    {
        // Violates ALTINNAPP0701: the stage is discarded, so no IEFormidlingMetadata is ever registered.
        services.AddEFormidling();

        // Fine: the stage is carried on to the call that completes it.
        services.AddEFormidling().WithMetadata<TestEFormidlingMetadata>();

        // Fine: the completed builder carries no marker, so discarding it is not a defect.
        services.AddEFormidling().WithMetadata<TestEFormidlingMetadata>().WithConfig("EFormidlingClientSettings");

        // Fine: the stage escapes into a local, which this analyzer deliberately does not chase.
        IEFormidlingMetadataStage stage = services.AddEFormidling();
        stage.WithMetadata<TestEFormidlingMetadata>();
    }
}
