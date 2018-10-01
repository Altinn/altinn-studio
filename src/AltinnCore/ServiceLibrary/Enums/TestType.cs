namespace AltinnCore.ServiceLibrary.Enums
{
    /// <summary>
    /// Enumeration for all available service events
    /// </summary>
    public enum TestType : int
    {
        /// <summary>
        /// Unit test of model and rules
        /// </summary>
        Unit = 1,

        /// <summary>
        /// Performance test of model and rules
        /// </summary>
        Performance = 2,

        /// <summary>
        /// WebDriver browser test
        /// </summary>
        WebDriver = 3
    }
}
