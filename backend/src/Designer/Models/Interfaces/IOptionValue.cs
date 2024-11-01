namespace Altinn.Studio.Designer.Models.Interfaces;

public interface IOptionValue;

public class StringOptionValue(string value) : IOptionValue
{
    public string Value { get; } = value;
}

public class BoolOptionValue(bool value) : IOptionValue
{
    public bool Value { get; } = value;
}

public class DoubleOptionValue(double value) : IOptionValue
{
    public double Value { get; } = value;
}
