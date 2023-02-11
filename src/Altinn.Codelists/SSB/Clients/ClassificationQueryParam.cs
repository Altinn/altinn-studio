namespace Altinn.Codelists.SSB.Clients
{
    /// <summary>
    /// Class holding query parameters to pass on to SSB's
    /// classifications api.
    /// </summary>
    public class ClassificationQueryParam
    {
        /// <summary>
        /// Codes valid from this date (inclusive).
        /// </summary>
        public DateOnly FromDate { get; set; } = DateOnly.FromDateTime(DateTime.Today);

        /// <summary>
        /// Codes valid until this date (exclusive).
        /// </summary>
        public DateOnly ToDate { get; set; } = DateOnly.MaxValue;
    }
}