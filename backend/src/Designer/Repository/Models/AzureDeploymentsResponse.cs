using System;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Repository.Models
{
    public class Deployment : IEquatable<Deployment>
    {

        public bool Equals(Deployment other)
        {
            return other.Release == Release && other.Version == Version;
        }

        [JsonPropertyName("release")]
        public string Release { get; set; }
        [JsonPropertyName("version")]
        public string Version { get; set; }
    }
}
