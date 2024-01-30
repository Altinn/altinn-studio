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

        /// <summary>
        /// Gets or sets the status of the deployment.
        /// This represents the current state of the deployment in the Kubernetes cluster, such as 'Available', 'Progressing', 'Failed', etc.
        /// </summary>
        public string Status { get; set; }

        /// <summary>
        /// Gets or sets the availability percentage of the deployment.
        /// This represents the percentage of pods that are up and running compared to the total number of pods in the deployment.
        /// </summary>
        public int AvailabilityPercentage { get; set; }
    }
}
