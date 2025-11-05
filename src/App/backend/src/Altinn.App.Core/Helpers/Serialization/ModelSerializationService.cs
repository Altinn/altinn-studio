using System.Collections.Concurrent;
using System.Text;
using System.Text.Json;
using System.Xml;
using System.Xml.Serialization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Models.Result;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Altinn.App.Core.Helpers.Serialization;

/// <summary>
/// DI registered service for centralizing (de)serialization logic for data models
/// </summary>
public sealed class ModelSerializationService
{
    private static readonly JsonSerializerOptions _jsonSerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly XmlSerializerCache _xmlSerializer = new();

    private readonly Telemetry? _telemetry;
    private readonly IAppModel _appModel;

    /// <summary>
    /// Constructor for the ModelDeserializerService
    /// </summary>
    public ModelSerializationService(IAppModel appModel, Telemetry? telemetry = null)
    {
        _appModel = appModel;
        _telemetry = telemetry;
    }

    /// <summary>
    /// Deserialize binary data from storage to a model of the classRef specified in the dataType
    /// </summary>
    /// <param name="data">The binary data</param>
    /// <param name="dataType">The data type used to get content type and the classRef for the object to be returned</param>
    /// <returns>The model specified in </returns>
    public object DeserializeFromStorage(ReadOnlySpan<byte> data, DataType dataType)
    {
        var type = GetModelTypeForDataType(dataType);

        // TODO: support sending json to storage based on dataType.ContentTypes
        return DeserializeXml(data, type);
    }

    /// <summary>
    /// Serialize an object to binary data for storage, respecting classRef and content type in dataType
    /// </summary>
    /// <param name="model">The object to serialize (must match the classRef in DataType)</param>
    /// <param name="dataType">The data type</param>
    /// <returns>the binary data and the content type (currently only application/xml, but likely also json in the future)</returns>
    /// <exception cref="InvalidOperationException">If the classRef in dataType does not match type of the model</exception>
    public (ReadOnlyMemory<byte> data, string contentType) SerializeToStorage(object model, DataType dataType)
    {
        var type = GetModelTypeForDataType(dataType);
        if (type != model.GetType())
        {
            throw new InvalidOperationException(
                $"DataType {dataType.Id} expects {type.FullName}, found {model.GetType().FullName}"
            );
        }

        //TODO: support sending json to storage based on dataType.ContentTypes
        return (SerializeToXml(model), "application/xml");
    }

    /// <summary>
    /// Serialize an object to xml
    /// </summary>
    /// <param name="model">The object to serialize</param>
    /// <returns>The bytes of the serialized xml in UTF8 encoding</returns>
    public ReadOnlyMemory<byte> SerializeToXml(object model)
    {
        var modelType = model.GetType();
        using var activity = _telemetry?.StartSerializeToXmlActivity(modelType);

        // Ensure that model is mutated in the same way it would be when deserialized from storage
        // (evaluate ShouldSerialize* methods, set empty strings to null, etc.)
        ObjectUtils.PrepareModelForXmlStorage(model);

        XmlWriterSettings xmlWriterSettings = new XmlWriterSettings()
        {
            Encoding = new UTF8Encoding(false),
            NewLineHandling = NewLineHandling.None,
        };
        using var memoryStream = new MemoryStream();
        using XmlWriter xmlWriter = XmlWriter.Create(memoryStream, xmlWriterSettings);

        XmlSerializer serializer = _xmlSerializer.GetSerializer(modelType);
        serializer.Serialize(xmlWriter, model);
        return memoryStream.ToArray().AsMemory().RemoveBom();
    }

    /// <summary>
    /// Serialize an object to json
    /// </summary>
    /// <param name="model">The object to serialize</param>
    /// <returns>the serialized UTF8 encoded bytes</returns>
    public ReadOnlyMemory<byte> SerializeToJson(object model)
    {
        var modelType = model.GetType();
        using var span = _telemetry?.StartSerializeToJsonActivity(modelType);
        var json = JsonSerializer.SerializeToUtf8Bytes(model, modelType, _jsonSerializerOptions);
        return json;
    }

    /// <summary>
    /// Deserialize a single object from a stream
    /// </summary>
    public async Task<ServiceResult<object, ProblemDetails>> DeserializeSingleFromStream(
        Stream body,
        string? contentType,
        DataType dataType
    )
    {
        using var memoryStream = new MemoryStream();
        await body.CopyToAsync(memoryStream);
        if (!memoryStream.TryGetBuffer(out var segment))
        {
            throw new InvalidOperationException("Failed to get buffer from memory stream");
        }

        var modelType = GetModelTypeForDataType(dataType);
        object model;
        if (contentType?.Contains("application/xml") ?? true) // default to xml if no content type is provided
        {
            try
            {
                model = DeserializeXml(segment, modelType);
            }
            catch (Exception e)
            {
                // XML deserialization can throw a variety of exceptions,
                // all of which should result in a 400 response
                // The actual exception is logged by the DeserializeXml method
                var message = e.InnerException is null ? e.Message : $"{e.Message} {e.InnerException.Message}";
                return new ProblemDetails()
                {
                    Title = "Failed to deserialize XML",
                    Detail = message,
                    Status = StatusCodes.Status400BadRequest,
                };
            }
        }
        else if (contentType.Contains("application/json"))
        {
            try
            {
                model = DeserializeJson(segment, modelType);
            }
            catch (JsonException e)
            {
                return new ProblemDetails()
                {
                    Title = "Failed to deserialize JSON",
                    Detail = e.Message,
                    Status = StatusCodes.Status400BadRequest,
                };
            }
        }
        else
        {
            return new ProblemDetails()
            {
                Title = "Unsupported content type",
                Detail = $"Content type {contentType} is not supported for deserialization",
                Status = StatusCodes.Status415UnsupportedMediaType,
            };
        }

        return model;
    }

    /// <summary>
    /// Deserialize utf8 encoded json data to a model of the specified type
    ///
    /// Basically just JsonSerializer.Deserialize, but with a telemetry activity and BOM removal
    /// </summary>
    /// <param name="data">The binary UTF8 encoded json</param>
    /// <param name="modelType">The target type for deserialization</param>
    /// <returns>The deserialized object</returns>
    public object DeserializeJson(ReadOnlySpan<byte> data, Type modelType)
    {
        using var activity = _telemetry?.StartDeserializeFromJsonActivity(modelType);
        try
        {
            return JsonSerializer.Deserialize(data.RemoveBom(), modelType, _jsonSerializerOptions)
                ?? throw new JsonException("Json deserialization returned null");
        }
        catch (Exception ex)
        {
            activity?.AddException(ex);
            throw;
        }
    }

    /// <summary>
    /// Deserialize utf8 encoded xml data to a model of the specified type
    /// </summary>
    public object DeserializeXml(ReadOnlySpan<byte> data, Type modelType)
    {
        using var activity = _telemetry?.StartDeserializeFromXmlActivity(modelType);
        try
        {
            // convert to UTF16 string as it seems to be preferred by the XmlTextReader
            // and aligns with previous implementation
            string streamContent = Encoding.UTF8.GetString(data.RemoveBom());
            if (string.IsNullOrWhiteSpace(streamContent))
            {
                throw new ArgumentException("No XML content read from stream");
            }
            try
            {
                using XmlTextReader xmlTextReader = new XmlTextReader(new StringReader(streamContent));
                XmlSerializer serializer = _xmlSerializer.GetSerializer(modelType);

                return serializer.Deserialize(xmlTextReader)
                    ?? throw new InvalidOperationException("Deserialization returned null");
            }
            catch (InvalidOperationException)
            {
                using XmlTextReader xmlTextReader = new XmlTextReader(new StringReader(streamContent));
                XmlSerializer serializer = _xmlSerializer.GetSerializerIgnoreNamespace(modelType);

                return serializer.Deserialize(xmlTextReader)
                    ?? throw new InvalidOperationException("Deserialization returned null");
            }
        }
        catch (Exception ex)
        {
            activity?.AddException(ex);
            throw;
        }
    }

    private Type GetModelTypeForDataType(DataType dataType)
    {
        if (dataType.AppLogic?.ClassRef is not { } classRef)
        {
            throw new InvalidOperationException(
                $"Data type {dataType.Id} does not have a appLogic.classRef in application metadata"
            );
        }

        var type = _appModel.GetModelType(classRef);
        return type;
    }

    /// <summary>
    /// XmlSerializer instances should be cached to avoid the overhead of creating them repeatedly.
    ///
    /// We cache two types of XmlSerializers:
    /// 1. XmlSerializer: The default serializer for a given model type.
    /// 2. XmlSerializer: A serializer that ignores the namespace of the XML, so we can deserialize XML without a namespace declaration.
    /// </summary>
    private class XmlSerializerCache
    {
        private readonly ConcurrentDictionary<Type, XmlSerializer> _xmlSerializers = new();
        private readonly ConcurrentDictionary<Type, XmlSerializer> _xmlSerializersWithOverride = new();

        /// <summary>
        /// Get a cached XmlSerializer for the given model type.
        /// </summary>
        public XmlSerializer GetSerializer(Type modelType)
        {
            return _xmlSerializers.GetOrAdd(modelType, t => new XmlSerializer(t));
        }

        /// <summary>
        /// Get a cached XmlSerializer for the given model type, that ignores the namespace of the XML.
        /// </summary>
        public XmlSerializer GetSerializerIgnoreNamespace(Type modelType)
        {
            return _xmlSerializersWithOverride.GetOrAdd(
                modelType,
                t =>
                {
                    // In this backup try block we assume that the modelType has declared a namespace,
                    // but that the XML is without any namespace declaration.
                    string elementName = GetRootElementName(modelType);

                    XmlAttributeOverrides attributeOverrides = new XmlAttributeOverrides();
                    XmlAttributes attributes = new XmlAttributes();
                    attributes.XmlRoot = new XmlRootAttribute(elementName);
                    attributeOverrides.Add(modelType, attributes);
                    return new XmlSerializer(t, attributeOverrides);
                }
            );
        }

        private static string GetRootElementName(Type modelType)
        {
            Attribute[] attributes = Attribute.GetCustomAttributes(modelType);

            foreach (var attribute in attributes)
            {
                if (attribute is XmlRootAttribute xmlRootAttribute)
                {
                    return xmlRootAttribute.ElementName;
                }
            }

            return modelType.Name;
        }
    }

    /// <summary>
    /// Initialize an empty object of the specified type
    /// </summary>
    public object GetEmpty(DataType dataType)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(dataType?.AppLogic?.ClassRef);
        return _appModel.Create(dataType.AppLogic.ClassRef);
    }
}
