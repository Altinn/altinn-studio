namespace Altinn.Codelists.SSB.Models;

/// <summary>
/// Supported classifications as defined by SSB, ref. https://data.ssb.no/api/klass/v1/classifications
/// </summary>
public enum Classification
{
    /// <summary>
    /// Standard for kjønn
    /// </summary>
    Sex = 2,

    /// <summary>
    /// Standard for næringsgruppering
    /// </summary>
    IndustryGrouping = 6,

    /// <summary>
    /// Standard for yrkesklassifisering
    /// </summary>
    Occupations = 7,

    /// <summary>
    /// Standard for sivilstand
    /// </summary>
    MaritalStatus = 19,

    /// <summary>
    /// Standard for grunnbeløpet i folketrygden (beløp pr. 1.5 )
    /// </summary>
    BaseAmountNationalInsurance = 20,

    /// <summary>
    /// Standard for fylker
    /// </summary>
    Counties = 104,

    /// <summary>
    /// Standard for kommuner
    /// </summary>
    Municipalities = 131,

    /// <summary>
    /// Standard for landkoder (alfa-3)
    /// </summary>
    Countries = 552,
}
