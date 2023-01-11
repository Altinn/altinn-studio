using System.Xml.Linq;

namespace Altinn.Studio.Designer.ModelMetadatalModels
{
    /// <summary>
    /// Class containing XNamespace and XName for various xml and xsd element 
    /// </summary>
    public struct XDocName
    {
        #region - Namespaces -

        /// <summary>
        /// XNamespace for x forms
        /// </summary>
        public static readonly XNamespace XFormNS = "http://www.w3.org/2002/01/xforms";

        /// <summary>
        /// XNamespace for or
        /// </summary>
        public static readonly XNamespace BrregNS = "http://www.brreg.no/or";

        /// <summary>
        /// XNamespace for XSD
        /// </summary>
        public static readonly XNamespace XSDNS = "http://www.w3.org/2001/XMLSchema";

        /// <summary>
        /// XNamespace for XSI
        /// </summary>
        public static readonly XNamespace XSINS = "http://www.w3.org/2001/XMLSchema-instance";

        /// <summary>
        /// XNamespace for APE
        /// </summary>
        public static readonly XNamespace AltinnPresentaionEngineNS = "http://www.altinn.no/schemas/altinn-presentation-engine";

        /// <summary>
        /// XNamespace for AFE
        /// </summary>
        public static readonly XNamespace AltinnFormsEngineNS = "http://www.altinn.no/schemas/altinn-forms-engine";

        #endregion

        #region - XFormNS Emelemts -

        /// <summary>
        /// XName for the caption element
        /// </summary>
        public static readonly XName Caption = XFormNS + "caption";

        /// <summary>
        /// XName for the help element
        /// </summary>
        public static readonly XName Help = XFormNS + "help";

        /// <summary>
        /// XName for the hint element
        /// </summary>
        public static readonly XName Hint = XFormNS + "hint";

        /// <summary>
        /// XName for the input element
        /// </summary>
        public static readonly XName Input = XFormNS + "input";

        /// <summary>
        /// XName for the selectOne element
        /// </summary>
        public static readonly XName SelectOne = XFormNS + "selectOne";

        /// <summary>
        /// XName for the value element
        /// </summary>
        public static readonly XName Value = XFormNS + "value";

        /// <summary>
        /// XName for the item element
        /// </summary>
        public static readonly XName Item = XFormNS + "item";

        /// <summary>
        /// XName for the choices element
        /// </summary>
        public static readonly XName Choices = XFormNS + "choices";

        /// <summary>
        /// XName for the schema element
        /// </summary>
        public static readonly XName Schema = XFormNS + "schema";

        /// <summary>
        /// XName for the repeat element
        /// </summary>
        public static readonly XName Repeat = XFormNS + "repeat";

        /// <summary>
        /// XName for the alert element
        /// </summary>
        public static readonly XName Alert = XFormNS + "alert";

        /// <summary>
        /// XName for the bind element
        /// </summary>
        public static readonly XName XFormBind = XFormNS + "bind";

        #endregion

        #region - BrregNS Emelemts -     

        /// <summary>
        /// XName for the brreg language element
        /// </summary>
        public static readonly XName Lang = BrregNS + "lang";

        /// <summary>
        /// XName for the brreg prefill element
        /// </summary>
        public static readonly XName Preutfyll = BrregNS + "preutfyll";

        /// <summary>
        /// XName for the brreg form element
        /// </summary>
        public static readonly XName Skjema = BrregNS + "skjema";

        /// <summary>
        /// XName for the brreg sensitivity element
        /// </summary>
        public static readonly XName Sensitivitet = BrregNS + "sensitivitet";

        /// <summary>
        /// XName for the brreg meaning element
        /// </summary>
        public static readonly XName Benevnelse = BrregNS + "benevnelse";

        /// <summary>
        /// XName for the brreg control element
        /// </summary>
        public static readonly XName Kontroll = BrregNS + "kontroll";

        /// <summary>
        /// XName for the brreg title element
        /// </summary>
        public static readonly XName Tittel = BrregNS + "tittel";

        /// <summary>
        /// XName for the brreg body element
        /// </summary>
        public static readonly XName Kropp = BrregNS + "kropp";

        /// <summary>
        /// XName for the brreg text element
        /// </summary>
        public static readonly XName Tekst = BrregNS + "tekst";

        /// <summary>
        /// XName for the brreg information element
        /// </summary>
        public static readonly XName Info = BrregNS + "info";

        /// <summary>
        /// XName for the brreg text type element
        /// </summary>
        public static readonly XName TextType = BrregNS + "teksttype";

        #endregion

        #region - XMLSchmeNS Emelemts -

        /// <summary>
        /// XName for the group element
        /// </summary>
        public static readonly XName Group = XSDNS + "group";

        /// <summary>
        /// XName for the import element
        /// </summary>
        public static readonly XName Import = XSDNS + "import";

        /// <summary>
        /// XName for the documentation element
        /// </summary>
        public static readonly XName Documentation = XSDNS + "documentation";

        /// <summary>
        /// XName for the annotation element
        /// </summary>
        public static readonly XName Annotation = XSDNS + "annotation";

        /// <summary>
        /// XName for the element element
        /// </summary>
        public static readonly XName Element = XSDNS + "element";

        /// <summary>
        /// XName for the sequence element
        /// </summary>
        public static readonly XName Sequence = XSDNS + "sequence";

        /// <summary>
        /// XName for the any element
        /// </summary>
        public static readonly XName Any = XSDNS + "any";

        /// <summary>
        /// XName for the list element
        /// </summary>
        public static readonly XName List = XSDNS + "list";

        /// <summary>
        /// XName for the choice element
        /// </summary>
        public static readonly XName Choice = XSDNS + "choice";

        /// <summary>
        /// XName for the attribute element
        /// </summary>
        public static readonly XName Attribute = XSDNS + "attribute";

        /// <summary>
        /// XName for the restriction element
        /// </summary>
        public static readonly XName Restriction = XSDNS + "restriction";

        /// <summary>
        /// XName for the enumeration element
        /// </summary>
        public static readonly XName Enumeration = XSDNS + "enumeration";

        /// <summary>
        /// XName for the any attribute element
        /// </summary>
        public static readonly XName AnyAttribute = XSDNS + "anyAttribute";

        /// <summary>
        /// XName for the simple type element
        /// </summary>
        public static readonly XName SimpleType = XSDNS + "simpleType";

        /// <summary>
        /// XName for the complex type element
        /// </summary>
        public static readonly XName ComplexType = XSDNS + "complexType";

        /// <summary>
        /// XName for the complex content element
        /// </summary>
        public static readonly XName ComplexContent = XSDNS + "complexContent";

        /// <summary>
        /// XName for the simple content element
        /// </summary>
        public static readonly XName SimpleContent = XSDNS + "simpleContent";

        /// <summary>
        /// XName for the extension element
        /// </summary>
        public static readonly XName Extension = XSDNS + "extension";

        /// <summary>
        /// XName for the string element
        /// </summary>
        public static readonly XName String = XSDNS + "string";

        /// <summary>
        /// XName for the GYear element
        /// </summary>
        public static readonly XName GYear = XSDNS + "gYear";

        /// <summary>
        /// XName for the decimal element
        /// </summary>
        public static readonly XName Decimal = XSDNS + "decimal";

        /// <summary>
        /// XName for the date element
        /// </summary>
        public static readonly XName Date = XSDNS + "date";

        /// <summary>
        /// XName for the length element
        /// </summary>
        public static readonly XName Length = XSDNS + "length";

        /// <summary>
        /// XName for the minimum length element
        /// </summary>
        public static readonly XName MinLength = XSDNS + "minLength";

        /// <summary>
        /// XName for the maximum length element
        /// </summary>
        public static readonly XName MaxLength = XSDNS + "maxLength";

        /// <summary>
        /// XName for the total digits element
        /// </summary>
        public static readonly XName TotalDigits = XSDNS + "totalDigits";

        /// <summary>
        /// XName for the pattern element
        /// </summary>
        public static readonly XName Pattern = XSDNS + "pattern";

        /// <summary>
        /// XName for the minimum inclusive element
        /// </summary>
        public static readonly XName MinInclusive = XSDNS + "minInclusive";

        /// <summary>
        /// XName for the maximum inclusive element
        /// </summary>
        public static readonly XName MaxInclusive = XSDNS + "maxInclusive";

        #endregion

        #region - XSD Elements -

        /// <summary>
        /// XName for the nil element
        /// </summary>
        public static readonly XName XSNil = XSINS + "nil";

        #endregion

        /// <summary>
        /// XName for the element indicating whether a form is prefilled
        /// </summary>
        public static readonly XName IsPrefill = AltinnPresentaionEngineNS + "prefilled";

        /// <summary>
        /// XName for the source form guid element
        /// </summary>
        public static readonly XName SourceFormGuid = "sourceformguid";

        /// <summary>
        /// XName for the AFE transfer element
        /// </summary>
        public static readonly XName AFETransfer = AltinnFormsEngineNS + "transfer";
    }
}
