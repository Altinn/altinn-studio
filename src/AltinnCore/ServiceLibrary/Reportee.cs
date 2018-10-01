namespace AltinnCore.ServiceLibrary
{
    /// <summary>
    /// Class representing a reportee
    /// </summary>
    public class Reportee
    {
        /// <summary>
        /// Gets or sets the reportee number
        /// </summary>
        public string ReporteeNumber { get; set; }

        /// <summary>
        /// Gets or sets the name of the reportee
        /// </summary>
        public string ReporteeName { get; set; }

        /// <summary>
        /// Gets or sets the party ID of the reportee
        /// </summary>
        public int PartyID { get; set; }

        /// <summary>
        /// Gets or sets the party type of the reportee
        /// </summary>
        public PartyType PartyType { get; set; }
    }
}
