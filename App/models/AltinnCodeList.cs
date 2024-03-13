namespace Altinn.App.models
{
    /// <summary>
    /// Represents a response from altinn code list API. Taking the type of the requested object as type.
    /// </summary>
    public class AltinnCodeList<T>
    {
        public string Name { get; set; }
        public int Version { get; set; }
        public int Language { get; set; }
        public T[] Codes { get; set; }    
    }
}
