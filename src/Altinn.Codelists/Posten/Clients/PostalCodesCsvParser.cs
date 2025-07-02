namespace Altinn.Codelists.Posten.Clients;

/// <summary>
/// Class for parsing the offical postal codes file in Norway.
/// Record description: https://www.bring.no/tjenester/adressetjenester/postnummer/postnummertabeller-veiledning
/// File used: https://www.bring.no/postnummerregister-ansi.txt
/// Examample record: 6863	LEIKANGER	4640	SOGNDAL	G
/// </summary>
internal sealed class PostalCodesCsvParser
{
    private Stream _csvStream { get; set; }

    /// <summary>
    /// Creates an instance of <see cref="PostalCodesCsvParser"/>
    /// </summary>
    public PostalCodesCsvParser(Stream stream)
    {
        _csvStream = stream;
    }

    /// <summary>
    /// Parses the stream provided in the constructor.
    /// </summary>
    public async Task<List<PostalCodeRecord>> Parse()
    {
        List<PostalCodeRecord> postalCodes = new();

        using (StreamReader reader = new StreamReader(_csvStream, Encoding.Latin1))
        {
            while (!reader.EndOfStream)
            {
                string? line = await reader.ReadLineAsync();

                if (line != null)
                {
                    string[] columns = line.Split('\t');
                    PostalCodeRecord postalCode = new(columns[0], columns[1], columns[2], columns[3], columns[4]);
                    postalCodes.Add(postalCode);
                }
            }
        }

        return postalCodes;
    }
}
