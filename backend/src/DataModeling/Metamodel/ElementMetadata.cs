using System.Collections.Generic;
using System.Text.Json.Serialization;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Altinn.Studio.DataModeling.Metamodel
{
    /// <summary>
    /// Metadata for a given service element
    /// </summary>
    public class ElementMetadata
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="ElementMetadata"/> class.
        /// </summary>
        public ElementMetadata()
        {
            CustomProperties = new Dictionary<string, string>();
            Restrictions = new Dictionary<string, Restriction>();
            Texts = new Dictionary<string, string>();
        }

        /// <summary>
        /// Gets or sets the ID of the element
        /// </summary>
        [JsonProperty(PropertyName = "id")]
        [JsonPropertyName("id")]
        public string ID { get; set; }

        /// <summary>
        /// Gets or sets the ID of the parent element. If a
        /// </summary>
        [JsonProperty(PropertyName = "parentElement")]
        [JsonPropertyName("parentElement")]
        public string ParentElement { get; set; }

        /// <summary>
        /// Gets or sets the type of this element
        /// </summary>
        [JsonProperty(PropertyName = "typeName")]
        [JsonPropertyName("typeName")]
        public string TypeName { get; set; }

        /// <summary>
        /// Gets or sets the element name. The Name should not contain '-'
        /// </summary>
        [JsonProperty(PropertyName = "name")]
        [JsonPropertyName("name")]
        public string Name { get; set; }

        /// <summary>
        /// Gets or sets the data binding name for the element. If an DataBindingName is null it cannot be used for a data-field.
        /// It is used by the frontend to filter elements that can be used in single-field ux-components.
        /// </summary>
        [JsonProperty(PropertyName = "dataBindingName")]
        [JsonPropertyName("dataBindingName")]
        public string DataBindingName { get; set; }

        /// <summary>
        /// Gets or sets the element xpath
        /// </summary>
        [JsonProperty(PropertyName = "xPath")]
        [JsonPropertyName("xPath")]
        public string XPath { get; set; }

        /// <summary>
        /// Gets or sets the restrictions for this element (<see cref="Restriction"/>)
        /// </summary>
        [JsonProperty(PropertyName = "restrictions")]
        [JsonPropertyName("restrictions")]
        public Dictionary<string, Restriction> Restrictions { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="ElementType"/>
        /// </summary>
        [Newtonsoft.Json.JsonConverter(typeof(StringEnumConverter))]
        [JsonProperty(PropertyName = "type")]
        [JsonPropertyName("type")]
        public ElementType Type { get; set; }

        /// <summary>
        /// Gets or sets the <see cref="BaseValueType">xsd value type</see> of this element
        /// </summary>
        [Newtonsoft.Json.JsonConverter(typeof(StringEnumConverter))]
        [JsonProperty(PropertyName = "xsdValueType")]
        [JsonPropertyName("xsdValueType")]
        public BaseValueType? XsdValueType { get; set; }

        /// <summary>
        /// Gets or sets any text associated with this element
        /// </summary>
        [JsonProperty(PropertyName = "texts")]
        [JsonPropertyName("texts")]
        public Dictionary<string, string> Texts { get; set; }

        /// <summary>
        /// Gets or sets custom properties for this element
        /// </summary>
        [JsonProperty(PropertyName = "customProperties")]
        [JsonPropertyName("customProperties")]
        public Dictionary<string, string> CustomProperties { get; set; }

        /// <summary>
        /// Gets or sets the maximum number of times this element can be repeated
        /// </summary>
        [JsonProperty(PropertyName = "maxOccurs")]
        [JsonPropertyName("maxOccurs")]
        public int MaxOccurs { get; set; }

        /// <summary>
        /// Gets or sets the minimum number of times this element can be repeated
        /// </summary>
        [JsonProperty(PropertyName = "minOccurs")]
        [JsonPropertyName("minOccurs")]
        public int MinOccurs { get; set; }

        /// <summary>
        /// Gets or sets the XName for this element. The XML name.
        /// </summary>
        [JsonProperty(PropertyName = "xName")]
        [JsonPropertyName("xName")]
        public string XName { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether this element is the content of the parent tag. Special case of SimpleContent.
        /// </summary>
        [JsonProperty(PropertyName = "isTagContent")]
        [JsonPropertyName("isTagContent")]
        public bool IsTagContent { get; set; }

        /// <summary>
        /// Gets or sets the fixed value of an element
        /// </summary>
        [JsonProperty(PropertyName = "fixedValue")]
        [JsonPropertyName("fixedValue")]
        public string FixedValue { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether this element is read only
        /// </summary>
        [JsonProperty(PropertyName = "isReadOnly")]
        [JsonPropertyName("isReadOnly")]
        public bool IsReadOnly { get; set; }

        /// <summary>
        /// The reference to the Xml Schema declaration
        /// </summary>
        [JsonProperty(PropertyName = "xmlSchemaXPath")]
        [JsonPropertyName("xmlSchemaXPath")]
        public string XmlSchemaXPath { get; set; }

        /// <summary>
        /// Used to point to the reference to the Json Schema declaration
        /// </summary>
        [JsonProperty(PropertyName = "jsonSchemaPointer")]
        [JsonPropertyName("jsonSchemaPointer")]
        public string JsonSchemaPointer { get; set; }

        /// <summary>
        /// Used to display the property in a view. Contains name, cardinality and type. Example: melding.person.name: [0..1] string
        /// </summary>
        [JsonProperty(PropertyName = "displayString")]
        [JsonPropertyName("displayString")]
        public string DisplayString { get; set; }

        /// <summary>
        /// Used for xsd context. Indicates if nillable is set in xsd schema.
        /// </summary>
        [JsonProperty(PropertyName = "nillable")]
        [JsonPropertyName("nillable")]
        public bool? Nillable { get; set; }

        [Newtonsoft.Json.JsonIgnore]
        [System.Text.Json.Serialization.JsonIgnore]
        [JsonProperty(PropertyName = "orderOblivious")]
        [JsonPropertyName("orderOblivious")]
        public bool OrderOblivious { get; set; } = false;
    }
}
