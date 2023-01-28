namespace Altinn.Codelists.SSB.Models;

/// <summary>
/// Supported classifications as defined by SSB, ref. http://data.ssb.no/api/klass/v1/classifications 
/// </summary>
public enum Classification
{
    /// <summary>
    /// Standard for sivilstand
    /// </summary>
    MaritalStatus = 19,

    /// <summary>
    /// Standard for landkoder (alfa-3)
    /// </summary>
    Countries = 552
}