using System.Text.Json;
using System.Text.Json.Serialization;

namespace Altinn.Notifications.Core.Models.AltinnServiceUpdate
{
    /// <summary>
    /// A class holding data on an exceeded resource limit in an Altinn service
    /// </summary>
    public class ResourceLimitExceeded
    {
        private static readonly JsonSerializerOptions _serializerOptions = new JsonSerializerOptions()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingDefault,
            WriteIndented = true,
            Converters = { new JsonStringEnumConverter() },
            PropertyNameCaseInsensitive = true
        };

        /// <summary>
        /// The resource that has reached its capacity limit
        /// </summary>
        public string Resource { get; set; } = string.Empty;

        /// <summary>
        /// The timestamp for when the service is available again
        /// </summary>
        public DateTime ResetTime { get; set; }

        /// <summary>
        /// Serialize the <see cref="ResourceLimitExceeded"/> into a json string
        /// </summary>
        /// <returns></returns>
        public string Serialize()
        {
            return JsonSerializer.Serialize(this, _serializerOptions);
        }

        /// <summary>
        /// Try to parse a json string into a<see cref="ResourceLimitExceeded"/>
        /// </summary>
        public static bool Tryparse(string input, out ResourceLimitExceeded value)
        {
            ResourceLimitExceeded? parsedOutput;
            value = new ResourceLimitExceeded();

            if (string.IsNullOrEmpty(input))
            {
                return false;
            }

            try
            {
                parsedOutput = JsonSerializer.Deserialize<ResourceLimitExceeded>(input!, _serializerOptions);

                value = parsedOutput!;
                return !string.IsNullOrEmpty(value.Resource);
            }
            catch
            {
                // try parse, we simply return false if fails
            }

            return false;
        }
    }
}
