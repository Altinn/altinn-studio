namespace Altinn.Codelists.Posten.Clients;

/// <summary>
/// Information about a postal code ie. a record representing one line in the postal codes csv file.
/// </summary>
public record PostalCodeRecord
{
    /// <summary>
    /// Creates an instance of <see cref="PostalCodeRecord"/>
    /// </summary>
    public PostalCodeRecord(
        string postCode,
        string postalName,
        string municipalityNumber,
        string municipalityName,
        string category
    )
    {
        PostCode = postCode;
        PostalName = postalName;
        MunicipalityNumber = municipalityNumber;
        MunicipalityName = municipalityName;
        Category = category;
    }

    /// <summary>
    /// Post code
    /// </summary>
    public string PostCode { get; init; }

    /// <summary>
    /// Postal name
    /// </summary>
    public string PostalName { get; init; }

    /// <summary>
    /// Municipality number
    /// </summary>
    public string MunicipalityNumber { get; init; }

    /// <summary>
    /// Municipality name
    /// </summary>
    public string MunicipalityName { get; init; }

    /// <summary>
    /// Category.
    /// B = Both streeet addresses and P.O.Boxes
    /// F = Multiple areas of uses(Common)
    /// G = Street addresses
    /// P = P.O.Boxes
    /// S = Postcode for special service(not used for addresses)
    /// </summary>
    public string Category { get; init; }
}
