using System;
using System.Runtime.InteropServices;
using System.Text;

namespace Altinn.Studio.Common.Domain.App;

/// <summary>
/// Reads which app frontend version an app loads from <see cref="IndexPath"/>. An app on v8 or earlier has the page.
/// From v9 the backend serves the frontend itself, unless the app has kept the page.
/// </summary>
/// <remarks>
/// A <c>meta</c> tag with <c>data-altinn-app-frontend-version</c> wins. Otherwise the version is the path segment of
/// the first <c>altinn-app-frontend.js</c> script whose source is on altinncdn.no. Either must be an
/// <see cref="AppFrontendVersion"/>, or the page names none. Old pages hold malformed markup and Razor, so it scans
/// tags leniently, skipping HTML and Razor comments and the content of elements that hold text, such as scripts.
/// </remarks>
public static class AppFrontendVersionReader
{
    /// <summary>The page that loads the app frontend, relative to the app's root.</summary>
    public const string IndexPath = "App/views/Home/Index.cshtml";

    private const string MetaAttribute = "data-altinn-app-frontend-version";
    private const string ScriptPrefix = "https://altinncdn.no/toolkits/altinn-app-frontend/";
    private const string ScriptFile = "altinn-app-frontend.js";
    private const string ScriptSuffix = "/" + ScriptFile;

    // The elements whose content is text, so that a tag written in it is not a tag of the page.
    private static readonly string[] s_textElements = ["script", "style", "textarea", "title"];

    /// <summary>Reads the version from the page's UTF-8 bytes, or returns <c>null</c> when it names none.</summary>
    public static AppFrontendVersion? Read(ReadOnlyMemory<byte> content)
    {
        string text =
            MemoryMarshal.TryGetArray(content, out ArraySegment<byte> segment) && segment.Array is not null
                ? Encoding.UTF8.GetString(segment.Array, segment.Offset, segment.Count)
                : Encoding.UTF8.GetString(content.ToArray());
        return Read(text);
    }

    /// <summary>Reads the version from the page, or returns <c>null</c> when it names none.</summary>
    public static AppFrontendVersion? Read(string content)
    {
        string? metaVersion = null;
        string? scriptSegment = null;
        var tags = new TagScanner(WithoutRazorComments(content));
        while (metaVersion is null && tags.Next())
        {
            if (tags.NameIs("meta"))
            {
                string? value = tags.Attribute(MetaAttribute);
                if (value is not null && value.Trim().Length > 0)
                {
                    metaVersion = value.Trim();
                }
            }
            else if (tags.NameIs("script"))
            {
                scriptSegment ??= SegmentOfScriptSource(tags.Attribute("src")?.Trim());
            }
        }

        return AppFrontendVersion.TryParse(metaVersion ?? scriptSegment, out var version) ? version : null;
    }

    // The segment between the CDN address and the file name of the script, which is the version when the page
    // loads the app frontend from there. The page loads what the source starts with, so the address must not only
    // be somewhere in it.
    private static string? SegmentOfScriptSource(string? source)
    {
        if (source is null || !source.StartsWith(ScriptPrefix, StringComparison.Ordinal))
        {
            return null;
        }

        // The suffix starts inside the prefix when the source has no segment between them. The file name ends the
        // path, so only a query or a fragment can follow it.
        int suffix = source.IndexOf(ScriptSuffix, StringComparison.Ordinal);
        int end = suffix + ScriptSuffix.Length;
        if (suffix < ScriptPrefix.Length || (end < source.Length && source[end] is not ('?' or '#')))
        {
            return null;
        }

        // One segment of the path, so not a file name that is only named in the query of another script.
        string segment = source.Substring(ScriptPrefix.Length, suffix - ScriptPrefix.Length);
        return segment.AsSpan().IndexOfAny('/', '?', '#') < 0 ? segment : null;
    }

    // Razor leaves a comment, @* to *@, out of the page it renders, wherever in the page it is. @@ is an @ as text,
    // so of several @ in a row only an odd one out starts a comment.
    private static string WithoutRazorComments(string page)
    {
        int open = page.IndexOf("@*", StringComparison.Ordinal);
        if (open < 0)
        {
            return page;
        }

        var result = new StringBuilder(page.Length);
        int position = 0;
        while (open >= 0)
        {
            int first = open;
            while (first > position && page[first - 1] == '@')
            {
                first--;
            }

            if ((open - first) % 2 == 1)
            {
                open = page.IndexOf("@*", open + 1, StringComparison.Ordinal);
                continue;
            }

            result.Append(page, position, open - position);
            int close = page.IndexOf("*@", open + 2, StringComparison.Ordinal);
            position = close < 0 ? page.Length : close + 2;
            open = page.IndexOf("@*", position, StringComparison.Ordinal);
        }

        return result.Append(page, position, page.Length - position).ToString();
    }

    // Finds start tags in HTML, one at a time, and reads their attributes on request.
    private struct TagScanner
    {
        private readonly string _html;
        private int _position;
        private int _nameStart;
        private int _nameEnd;
        private int _tagEnd;

        public TagScanner(string html)
        {
            _html = html;
        }

        public readonly bool NameIs(string name) => TextEquals(_nameStart, _nameEnd, name);

        public bool Next()
        {
            while (true)
            {
                if (_tagEnd > _position)
                {
                    _position = _tagEnd;
                    SkipRawText();
                }

                int open = _html.IndexOf('<', _position);
                if (open < 0 || open + 1 >= _html.Length)
                {
                    _position = _html.Length;
                    return false;
                }

                if (string.CompareOrdinal(_html, open, "<!--", 0, 4) == 0)
                {
                    int close = _html.IndexOf("-->", open + 4, StringComparison.Ordinal);
                    _position = close < 0 ? _html.Length : close + 3;
                    continue;
                }

                _position = open + 1;
                if (!AsciiText.IsLetter(_html[_position]))
                {
                    continue;
                }

                _nameStart = _position;
                while (
                    _position < _html.Length && (AsciiText.IsLetterOrDigit(_html[_position]) || _html[_position] == '-')
                )
                {
                    _position++;
                }

                _nameEnd = _position;
                _tagEnd = FindTagEnd(_position);
                if (_tagEnd < 0)
                {
                    // A tag that the page ends in the middle of is no tag, as a browser has it.
                    _position = _tagEnd = _html.Length;
                    return false;
                }

                return true;
            }
        }

        // Returns the value of an attribute of the current tag, or null when the tag does not have it.
        public readonly string? Attribute(string name)
        {
            int position = _nameEnd;
            while (position < _tagEnd)
            {
                char c = _html[position];
                if (IsSpace(c) || c == '/')
                {
                    position++;
                    continue;
                }

                if (c == '>')
                {
                    return null;
                }

                int nameStart = position;
                while (position < _tagEnd && !IsSpace(_html[position]) && _html[position] is not ('=' or '>' or '/'))
                {
                    position++;
                }

                bool matches = TextEquals(nameStart, position, name);
                while (position < _tagEnd && IsSpace(_html[position]))
                {
                    position++;
                }

                string? value = string.Empty;
                if (position < _tagEnd && _html[position] == '=')
                {
                    position++;
                    while (position < _tagEnd && IsSpace(_html[position]))
                    {
                        position++;
                    }

                    (value, position) = ReadValue(position);
                }

                if (matches)
                {
                    return value;
                }
            }

            return null;
        }

        private readonly (string Value, int End) ReadValue(int position)
        {
            if (position < _tagEnd && _html[position] is '"' or '\'')
            {
                char quote = _html[position];
                int close = _html.IndexOf(quote, position + 1);
                int end = close < 0 || close > _tagEnd ? _tagEnd : close;
                return (_html.Substring(position + 1, end - position - 1), Math.Min(end + 1, _tagEnd));
            }

            int start = position;
            while (position < _tagEnd && !IsSpace(_html[position]) && _html[position] != '>')
            {
                position++;
            }

            return (_html.Substring(start, position - start), position);
        }

        // The index just after the '>' that ends the tag, skipping '>' inside quoted attribute values, or -1 when
        // the page ends before the tag does.
        private readonly int FindTagEnd(int position)
        {
            char quote = '\0';
            char previous = '\0';
            for (; position < _html.Length; position++)
            {
                char c = _html[position];
                if (quote != '\0')
                {
                    if (c == quote)
                    {
                        quote = '\0';
                    }

                    continue;
                }

                if (c is '"' or '\'' && previous == '=')
                {
                    quote = c;
                }
                else if (c == '>')
                {
                    return position + 1;
                }

                if (!IsSpace(c))
                {
                    previous = c;
                }
            }

            return -1;
        }

        // The characters that HTML takes for a space, which are fewer than the ones Unicode has.
        private static bool IsSpace(char c) => c is ' ' or '\t' or '\n' or '\f' or '\r';

        private readonly bool TextEquals(int start, int end, string name) =>
            end - start == name.Length
            && string.Compare(_html, start, name, 0, name.Length, StringComparison.OrdinalIgnoreCase) == 0;

        // Moves past the content of an element that holds text rather than markup, to its end tag.
        private void SkipRawText()
        {
            string? name = null;
            foreach (string candidate in s_textElements)
            {
                name = NameIs(candidate) ? candidate : name;
            }

            // A / before the > does not close these elements in HTML, so their text follows also then.
            if (name is null)
            {
                return;
            }

            // The end tag is the name and then a space, a / or a >, so </scripted> does not end a script.
            int search = _position;
            while (true)
            {
                int close = _html.IndexOf("</", search, StringComparison.Ordinal);
                int after = close + 2 + name.Length;
                if (close < 0 || after >= _html.Length)
                {
                    _position = _html.Length;
                    return;
                }

                if (
                    string.Compare(_html, close + 2, name, 0, name.Length, StringComparison.OrdinalIgnoreCase) == 0
                    && (IsSpace(_html[after]) || _html[after] is '/' or '>')
                )
                {
                    _position = close;
                    return;
                }

                search = close + 2;
            }
        }
    }
}
