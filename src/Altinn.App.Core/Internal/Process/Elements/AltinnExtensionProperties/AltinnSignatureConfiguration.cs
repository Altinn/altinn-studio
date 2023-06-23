using System.Xml.Serialization;

namespace Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;

/// <summary>
/// Configuration properties for signatures in a process task
/// </summary>
public class AltinnSignatureConfiguration
{
    /// <summary>
    /// Define what taskId that should be signed for signing tasks
    /// </summary>
    [XmlArray(ElementName = "dataTypesToSign", Namespace = "http://altinn.no/process", IsNullable = true)]
    [XmlArrayItem(ElementName = "dataType", Namespace = "http://altinn.no/process")]
    public List<string> DataTypesToSign { get; set; } = new();
        
    /// <summary>
    /// Set what dataTypeId that should be used for storing the signature
    /// </summary>
    [XmlElement("signatureDataType", Namespace = "http://altinn.no/process")]
    public string SignatureDataType { get; set; }
    
    /// <summary>
    /// Define what signature dataypes this signature should be unique from. Users that have sign any of the signatures in the list will not be able to sign this signature 
    /// </summary>
    [XmlArray(ElementName = "uniqueFromSignaturesInDataTypes", Namespace = "http://altinn.no/process", IsNullable = true)]
    [XmlArrayItem(ElementName = "dataType", Namespace = "http://altinn.no/process")]
    public List<string> UniqueFromSignaturesInDataTypes { get; set; } = new();
}
