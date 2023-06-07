using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    public class UserRequestSynchronizationSettings : ISettingsMarker
    {
        public int SemaphoreExpiryInMinutes { get; set; } = 120;
        public int CleanUpFrequencyInMinutes { get; set; } = 120;
        public int MaxDegreeOfParallelism { get; set; } = 1;
    }
}
