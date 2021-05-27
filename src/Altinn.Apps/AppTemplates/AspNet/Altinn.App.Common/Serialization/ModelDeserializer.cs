using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;

using Microsoft.Extensions.Logging;

using Newtonsoft.Json;

namespace Altinn.App.Common.Serialization
{
    /// <summary>
    /// Represents logic to deserialize a stream of data to an instance of the given type
    /// </summary>
    public class ModelDeserializer
    {
        private readonly ILogger _logger;
        private readonly Type _modelType;

        /// <summary>
        /// Gets the error message describing what it was that went wrong if there was an issue during deserialization.
        /// </summary>
        public string Error { get; private set; }

        /// <summary>
        /// Initialize a new instance of <see cref="ModelDeserializer"/> with a logger and the Type the deserializer should target.
        /// </summary>
        /// <param name="logger">A logger that can be used to write log information.</param>
        /// <param name="modelType">The Type the deserializer should target when deserializing data.</param>
        public ModelDeserializer(ILogger logger, Type modelType)
        {
            _logger = logger;
            _modelType = modelType;
        }

        /// <summary>
        /// Deserialize a stream with data of the given content type. The operation supports application/json and application/xml.
        /// </summary>
        /// <param name="stream">The data stream to deserialize.</param>
        /// <param name="contentType">The content type of the stream.</param>
        /// <returns>An instance of the initialized type if deserializing succeed.</returns>
        public async Task<object> DeserializeAsync(Stream stream, string contentType)
        {
            Error = null;

            if (contentType == null)
            {
                Error = $"Unknown content type {contentType}. Cannot read the data.";
                return null;
            }

            if (contentType.Contains("application/json"))
            {
                return await DeserializeJsonAsync(stream);
            }

            if (contentType.Contains("application/xml"))
            {
                return await DeserializeXmlAsync(stream);
            }

            Error = $"Unknown content type {contentType}. Cannot read the data.";
            return null;
        }

        private async Task<object> DeserializeJsonAsync(Stream stream)
        {
            Error = null;

            try
            {
                using StreamReader reader = new StreamReader(stream, Encoding.UTF8);
                string content = await reader.ReadToEndAsync();
                return JsonConvert.DeserializeObject(content, _modelType);
            }
            catch (JsonReaderException jsonReaderException)
            {
                Error = jsonReaderException.Message;
                return null;
            }
            catch (Exception ex)
            {
                string message = $"Unexpected exception when attempting to deserialize JSON into '{_modelType}'";
                _logger.LogError(ex, message);
                Error = message;
                return null;
            }
        }

        private async Task<object> DeserializeXmlAsync(Stream stream)
        {
            Error = null;

            try
            {
                using StreamReader reader = new StreamReader(stream, Encoding.UTF8);
                string content = await reader.ReadToEndAsync();

                using TextReader sr = new StringReader(content);

                XmlSerializer serializer = new XmlSerializer(_modelType);
                return serializer.Deserialize(sr);
            }
            catch (InvalidOperationException invalidOperationException)
            {
                Error = $"{invalidOperationException.Message} {invalidOperationException?.InnerException.Message}";
                return null;
            }
            catch (Exception ex)
            {
                string message = $"Unexpected exception when attempting to deserialize XML into '{_modelType}'";
                _logger.LogError(ex, message);
                Error = message;
                return null;
            }
        }
    }
}
