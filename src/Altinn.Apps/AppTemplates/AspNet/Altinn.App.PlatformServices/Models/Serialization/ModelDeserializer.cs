using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using System.Xml.Serialization;

using Microsoft.Extensions.Logging;

using Newtonsoft.Json;

namespace Altinn.App.PlatformServices.Models.Serialization
{
    /// <summary>
    /// Represents logic to deserialize a stream of data to an instance of the given type
    /// </summary>
    public class ModelDeserializer
    {
        private readonly ILogger _logger;
        private readonly Type _modelType;

        public string Error { get; private set; }

        public ModelDeserializer(ILogger logger, Type modelType)
        {
            _logger = logger;
            _modelType = modelType;
        }

        public async Task<object> DeserializeAsync(Stream stream, string contentType)
        {
            Error = null;

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
