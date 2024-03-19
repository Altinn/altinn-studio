namespace Altinn.Studio.Designer.Filters.DataModeling
{
    public static class DataModelingErrorCodes
    {
        public const string CsharpGenerationError = "DM_01";
        public const string XmlSchemaConvertError = "DM_02";
        public const string JsonSchemaConvertError = "DM_03";
        public const string ModelMetadataConvertError = "DM_04";
        public const string InvalidXmlError = "DM_05";
        public const string ModelWithTheSameTypeNameExists = nameof(ModelWithTheSameTypeNameExists);
    }
}
