namespace Altinn.Studio.DataModeling.Converter.Json
{
    /// <summary>
    /// Placeholder
    /// </summary>
    public enum CompatibleXsdType
    {
        Unknown,
        SimpleType,
        SimpleTypeList,
        SimpleTypeRestriction,
        SimpleContentExtension,
        SimpleContentRestriction,
        ComplexType,
        ComplexContent,
        ComplexContentExtension,
        ComplexContentRestriction,
        Group,
        Sequence,
        Choice,
        All,
        Attribute,
        Nillable,
        UnhandledAttribute,
        UnhandledEnumAttribute,
        Array
    }
}
