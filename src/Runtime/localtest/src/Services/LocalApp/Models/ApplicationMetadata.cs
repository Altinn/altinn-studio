#nullable enable

using System.Text.Json.Serialization;
using Altinn.Platform.Storage.Interface.Models;

namespace LocalTest.Services.LocalApp.Models
{
    public class ApplicationMetadata : Application
    {
        [JsonPropertyName("altinnNugetVersion")]
        public string? AltinnNugetVersion { get; set; }
    }
}
