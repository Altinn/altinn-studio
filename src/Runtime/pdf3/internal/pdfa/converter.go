package pdfa

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"
)

var (
	errInvalidPDF            = errors.New("invalid pdf")
	errTrailerNotFound       = errors.New("trailer not found")
	errTrailerMalformed      = errors.New("trailer malformed")
	errXrefMalformed         = errors.New("xref malformed")
	errXrefStreamUnsupported = errors.New("xref streams are unsupported")
	errCatalogMalformed      = errors.New("catalog object malformed")
	errObjectNotFound        = errors.New("object not found")
	errObjectMalformed       = errors.New("object malformed")
	errAlreadyHasPDFAFix     = errors.New("pdf already contains PDF/A metadata or output intent")
	errUnexpectedPDFDate     = errors.New("unexpected pdf date format")
)

type Converter struct{}

type objectRef struct {
	Generation int
	Number     int
}

type trailerInfo struct {
	RootObject objectRef
	InfoObject objectRef
	StartXRef  int
	Prev       int
	Size       int
	HasInfo    bool
	HasPrev    bool
}

type pdfState struct {
	Trailer     *trailerInfo
	ObjectIndex map[objectRef]int
}

type conversionSource struct {
	Trailer     *trailerInfo
	MetadataXML []byte
	RootBody    []byte
}

func NewConverter() *Converter {
	return &Converter{}
}

func (c *Converter) Convert(input []byte) ([]byte, error) {
	if !bytes.HasPrefix(input, []byte("%PDF-")) {
		return nil, errInvalidPDF
	}

	source, err := prepareConversionSource(input)
	if err != nil {
		return nil, err
	}

	newRootObject := source.Trailer.Size
	metadataObject := source.Trailer.Size + 1
	outputIntentObject := source.Trailer.Size + 2
	iccObject := source.Trailer.Size + 3

	rootWithPDFA, err := injectCatalogReferences(source.RootBody, metadataObject, outputIntentObject)
	if err != nil {
		return nil, err
	}

	var update bytes.Buffer
	offsets := make([]int, 0, 4)
	baseOffset := len(input)

	writeObject := func(objectNumber int, payload []byte) {
		update.WriteString("\n")
		offsets = append(offsets, baseOffset+update.Len())
		fmt.Fprintf(&update, "%d 0 obj\n", objectNumber)
		update.Write(payload)
		update.WriteString("\nendobj\n")
	}

	writeObject(newRootObject, rootWithPDFA)
	writeObject(metadataObject, buildMetadataObject(source.MetadataXML))
	writeObject(outputIntentObject, buildOutputIntentObject(iccObject))
	writeObject(iccObject, buildICCProfileObject())

	startXRef := baseOffset + update.Len()

	fmt.Fprintf(&update, "xref\n%d %d\n", newRootObject, len(offsets))
	for _, offset := range offsets {
		fmt.Fprintf(&update, "%010d 00000 n \n", offset)
	}

	fileID := sha256.Sum256(input)
	fileIDHex := hex.EncodeToString(fileID[:16])

	update.WriteString("trailer\n<<\n")
	fmt.Fprintf(&update, "/Size %d\n", source.Trailer.Size+4)
	fmt.Fprintf(&update, "/Root %d 0 R\n", newRootObject)
	if source.Trailer.HasInfo {
		fmt.Fprintf(&update, "/Info %d %d R\n", source.Trailer.InfoObject.Number, source.Trailer.InfoObject.Generation)
	}
	fmt.Fprintf(&update, "/Prev %d\n", source.Trailer.StartXRef)
	fmt.Fprintf(&update, "/ID [<%s> <%s>]\n", fileIDHex, fileIDHex)
	fmt.Fprintf(&update, ">>\nstartxref\n%d\n%%%%EOF\n", startXRef)

	return append(bytes.Clone(input), update.Bytes()...), nil
}

func prepareConversionSource(input []byte) (*conversionSource, error) {
	state, err := parsePDFState(input)
	if err != nil {
		return nil, err
	}

	rootBody, err := extractObjectBody(input, state.ObjectIndex, state.Trailer.RootObject)
	if err != nil {
		return nil, fmt.Errorf("extract root object: %w", err)
	}
	if bytes.Contains(rootBody, []byte("/Metadata ")) || bytes.Contains(rootBody, []byte("/OutputIntents ")) {
		return nil, errAlreadyHasPDFAFix
	}

	infoBody, err := loadInfoBody(input, state)
	if err != nil {
		return nil, err
	}

	metadataXML, err := buildXMPMetadata(parseInfoDictionary(infoBody))
	if err != nil {
		return nil, fmt.Errorf("build xmp metadata: %w", err)
	}

	return &conversionSource{
		Trailer:     state.Trailer,
		MetadataXML: metadataXML,
		RootBody:    rootBody,
	}, nil
}

func loadInfoBody(input []byte, state *pdfState) ([]byte, error) {
	if !state.Trailer.HasInfo {
		return nil, nil
	}

	infoBody, err := extractObjectBody(input, state.ObjectIndex, state.Trailer.InfoObject)
	if err != nil {
		return nil, fmt.Errorf("extract info object: %w", err)
	}
	return infoBody, nil
}

func parsePDFState(pdf []byte) (*pdfState, error) {
	startXRef, err := parseLastStartXRef(pdf)
	if err != nil {
		return nil, err
	}

	objectIndex := make(map[objectRef]int)
	visited := make(map[int]struct{})
	currentStartXRef := startXRef
	var latestTrailer *trailerInfo

	for {
		if _, seen := visited[currentStartXRef]; seen {
			return nil, errTrailerMalformed
		}
		visited[currentStartXRef] = struct{}{}

		trailer, entries, err := parseXrefSection(pdf, currentStartXRef)
		if err != nil {
			return nil, err
		}
		if latestTrailer == nil {
			latestTrailer = trailer
		}
		for ref, offset := range entries {
			if _, exists := objectIndex[ref]; !exists {
				objectIndex[ref] = offset
			}
		}
		if !trailer.HasPrev {
			break
		}
		currentStartXRef = trailer.Prev
	}

	if latestTrailer == nil {
		return nil, errTrailerNotFound
	}

	return &pdfState{
		Trailer:     latestTrailer,
		ObjectIndex: objectIndex,
	}, nil
}

func parseLastStartXRef(pdf []byte) (int, error) {
	index := bytes.LastIndex(pdf, []byte("startxref"))
	if index == -1 {
		return 0, errTrailerNotFound
	}

	value := strings.TrimSpace(string(pdf[index+len("startxref"):]))
	line := strings.SplitN(value, "\n", 2)[0]
	startXRef, err := strconv.Atoi(strings.TrimSpace(line))
	if err != nil {
		return 0, fmt.Errorf("parse startxref: %w", err)
	}
	return startXRef, nil
}

func parseXrefSection(pdf []byte, startXRef int) (*trailerInfo, map[objectRef]int, error) {
	if startXRef < 0 || startXRef >= len(pdf) {
		return nil, nil, errXrefMalformed
	}
	if bytes.HasPrefix(pdf[startXRef:], []byte("xref")) {
		return parseTraditionalXRefSection(pdf, startXRef)
	}
	return nil, nil, errXrefStreamUnsupported
}

func parseTraditionalXRefSection(pdf []byte, startXRef int) (*trailerInfo, map[objectRef]int, error) {
	position := startXRef + len("xref")
	if position >= len(pdf) {
		return nil, nil, errXrefMalformed
	}

	entries, position, err := parseXrefEntries(pdf, position)
	if err != nil {
		return nil, nil, err
	}

	trailerSectionEnd := bytes.Index(pdf[position:], []byte("startxref"))
	if trailerSectionEnd == -1 {
		return nil, nil, errTrailerMalformed
	}
	trailer, err := parseTrailerSection(string(pdf[position:position+trailerSectionEnd]), startXRef)
	if err != nil {
		return nil, nil, err
	}

	return trailer, entries, nil
}

func parseXrefEntries(pdf []byte, position int) (map[objectRef]int, int, error) {
	entries := make(map[objectRef]int)
	for {
		line, next, err := readLine(pdf, position)
		if err != nil {
			return nil, 0, errXrefMalformed
		}
		position = next
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}
		if bytes.Equal(line, []byte("trailer")) {
			return entries, position, nil
		}

		firstObject, count, err := parseXrefSubsectionHeader(line)
		if err != nil {
			return nil, 0, err
		}
		position, err = parseXrefSubsectionEntries(pdf, position, firstObject, count, entries)
		if err != nil {
			return nil, 0, err
		}
	}
}

func parseXrefSubsectionHeader(line []byte) (int, int, error) {
	fields := bytes.Fields(line)
	if len(fields) != 2 {
		return 0, 0, errXrefMalformed
	}

	firstObject, err := strconv.Atoi(string(fields[0]))
	if err != nil {
		return 0, 0, errXrefMalformed
	}
	count, err := strconv.Atoi(string(fields[1]))
	if err != nil {
		return 0, 0, errXrefMalformed
	}

	return firstObject, count, nil
}

func parseXrefSubsectionEntries(
	pdf []byte,
	position, firstObject, count int,
	entries map[objectRef]int,
) (int, error) {
	for i := range count {
		entryLine, nextEntry, err := readLine(pdf, position)
		if err != nil {
			return 0, errXrefMalformed
		}
		position = nextEntry

		offset, generation, inUse, err := parseXrefEntry(entryLine)
		if err != nil {
			return 0, err
		}
		if !inUse {
			continue
		}

		entries[objectRef{Number: firstObject + i, Generation: generation}] = offset
	}
	return position, nil
}

func parseXrefEntry(line []byte) (int, int, bool, error) {
	fields := bytes.Fields(line)
	if len(fields) != 3 || len(fields[2]) != 1 {
		return 0, 0, false, errXrefMalformed
	}

	offset, err := strconv.Atoi(string(fields[0]))
	if err != nil {
		return 0, 0, false, errXrefMalformed
	}
	generation, err := strconv.Atoi(string(fields[1]))
	if err != nil {
		return 0, 0, false, errXrefMalformed
	}
	if fields[2][0] != 'n' && fields[2][0] != 'f' {
		return 0, 0, false, errXrefMalformed
	}

	return offset, generation, fields[2][0] == 'n', nil
}

func parseTrailerSection(section string, startXRef int) (*trailerInfo, error) {
	size, err := parseRefInt(section, "/Size")
	if err != nil {
		return nil, fmt.Errorf("parse trailer size: %w", err)
	}
	rootObject, err := parseRequiredObjectRef(section, "/Root")
	if err != nil {
		return nil, fmt.Errorf("parse root object: %w", err)
	}
	infoObject, hasInfo, err := parseOptionalObjectRef(section, "/Info")
	if err != nil {
		return nil, fmt.Errorf("parse info object: %w", err)
	}
	prev, hasPrev, err := parseOptionalInt(section, "/Prev")
	if err != nil {
		return nil, fmt.Errorf("parse previous xref: %w", err)
	}

	return &trailerInfo{
		RootObject: rootObject,
		InfoObject: infoObject,
		Size:       size,
		StartXRef:  startXRef,
		Prev:       prev,
		HasInfo:    hasInfo,
		HasPrev:    hasPrev,
	}, nil
}

func parseRefInt(section string, key string) (int, error) {
	_, values, found := strings.Cut(section, key)
	if !found {
		return 0, errTrailerMalformed
	}
	fields := strings.Fields(values)
	if len(fields) == 0 {
		return 0, errTrailerMalformed
	}
	value, err := strconv.Atoi(fields[0])
	if err != nil {
		return 0, errTrailerMalformed
	}
	return value, nil
}

func parseOptionalInt(section string, key string) (int, bool, error) {
	_, values, found := strings.Cut(section, key)
	if !found {
		return 0, false, nil
	}
	fields := strings.Fields(values)
	if len(fields) == 0 {
		return 0, false, errTrailerMalformed
	}
	value, err := strconv.Atoi(fields[0])
	if err != nil {
		return 0, false, errTrailerMalformed
	}
	return value, true, nil
}

func parseRequiredObjectRef(section string, key string) (objectRef, error) {
	ref, found, err := parseObjectRef(section, key)
	if err != nil {
		return objectRef{}, err
	}
	if !found {
		return objectRef{}, errTrailerMalformed
	}
	return ref, nil
}

func parseOptionalObjectRef(section string, key string) (objectRef, bool, error) {
	return parseObjectRef(section, key)
}

func parseObjectRef(section string, key string) (objectRef, bool, error) {
	_, values, found := strings.Cut(section, key)
	if !found {
		return objectRef{}, false, nil
	}
	fields := strings.Fields(values)
	if len(fields) < 3 || !strings.HasPrefix(fields[2], "R") {
		return objectRef{}, false, errTrailerMalformed
	}
	number, err := strconv.Atoi(fields[0])
	if err != nil {
		return objectRef{}, false, errTrailerMalformed
	}
	generation, err := strconv.Atoi(fields[1])
	if err != nil {
		return objectRef{}, false, errTrailerMalformed
	}
	return objectRef{Number: number, Generation: generation}, true, nil
}

func extractObjectBody(pdf []byte, index map[objectRef]int, ref objectRef) ([]byte, error) {
	offset, found := index[ref]
	if !found {
		return nil, errObjectNotFound
	}
	if offset < 0 || offset >= len(pdf) {
		return nil, errObjectMalformed
	}

	headerLine, next, err := readLine(pdf, offset)
	if err != nil {
		return nil, errObjectMalformed
	}
	headerFields := bytes.Fields(headerLine)
	if len(headerFields) != 3 || string(headerFields[2]) != "obj" {
		return nil, errObjectMalformed
	}
	number, err := strconv.Atoi(string(headerFields[0]))
	if err != nil {
		return nil, errObjectMalformed
	}
	generation, err := strconv.Atoi(string(headerFields[1]))
	if err != nil {
		return nil, errObjectMalformed
	}
	if number != ref.Number || generation != ref.Generation {
		return nil, errObjectMalformed
	}

	bodyEnd := bytes.Index(pdf[next:], []byte("\nendobj"))
	if bodyEnd == -1 {
		bodyEnd = bytes.Index(pdf[next:], []byte("\rendobj"))
	}
	if bodyEnd == -1 {
		return nil, errObjectMalformed
	}
	bodyEnd += next

	return bytes.TrimSpace(pdf[next:bodyEnd]), nil
}

func readLine(data []byte, start int) ([]byte, int, error) {
	if start >= len(data) {
		return nil, start, io.EOF
	}

	end := start
	for end < len(data) && data[end] != '\n' && data[end] != '\r' {
		end++
	}

	next := end
	if next < len(data) && data[next] == '\r' {
		next++
		if next < len(data) && data[next] == '\n' {
			next++
		}
	} else if next < len(data) && data[next] == '\n' {
		next++
	}

	return data[start:end], next, nil
}

func injectCatalogReferences(rootBody []byte, metadataObject, outputIntentObject int) ([]byte, error) {
	last := bytes.LastIndex(rootBody, []byte(">>"))
	if last == -1 {
		return nil, errCatalogMalformed
	}

	var updated bytes.Buffer
	updated.Write(rootBody[:last])
	fmt.Fprintf(&updated, "\n/Metadata %d 0 R\n/OutputIntents [%d 0 R]\n", metadataObject, outputIntentObject)
	updated.Write(rootBody[last:])

	return updated.Bytes(), nil
}

type infoDictionary struct {
	CreationDate string
	Creator      string
	ModDate      string
	Producer     string
	Title        string
}

func parseInfoDictionary(body []byte) infoDictionary {
	return infoDictionary{
		Title:        extractLiteralString(body, "/Title", "Untitled"),
		Creator:      extractLiteralString(body, "/Creator", "Chromium"),
		Producer:     extractLiteralString(body, "/Producer", "Skia/PDF"),
		CreationDate: extractLiteralString(body, "/CreationDate", ""),
		ModDate:      extractLiteralString(body, "/ModDate", ""),
	}
}

func extractLiteralString(body []byte, key string, fallback string) string {
	index := bytes.Index(body, []byte(key))
	if index == -1 {
		return fallback
	}

	index += len(key)
	for index < len(body) && (body[index] == ' ' || body[index] == '\n' || body[index] == '\r' || body[index] == '\t') {
		index++
	}
	if index >= len(body) || body[index] != '(' {
		return fallback
	}
	index++

	var out bytes.Buffer
	escaped := false
	for index < len(body) {
		ch := body[index]
		index++
		if escaped {
			out.WriteByte(ch)
			escaped = false
			continue
		}
		if ch == '\\' {
			escaped = true
			continue
		}
		if ch == ')' {
			return out.String()
		}
		out.WriteByte(ch)
	}

	return fallback
}

func buildXMPMetadata(info infoDictionary) ([]byte, error) {
	createDate, err := normalizeOptionalXMPDate(info.CreationDate)
	if err != nil {
		return nil, err
	}
	modifyDate, err := normalizeOptionalXMPDate(info.ModDate)
	if err != nil {
		return nil, err
	}

	var title bytes.Buffer
	if err := xml.EscapeText(&title, []byte(info.Title)); err != nil {
		return nil, fmt.Errorf("escape title xml: %w", err)
	}
	var creator bytes.Buffer
	if err := xml.EscapeText(&creator, []byte(info.Creator)); err != nil {
		return nil, fmt.Errorf("escape creator xml: %w", err)
	}
	var producer bytes.Buffer
	if err := xml.EscapeText(&producer, []byte(info.Producer)); err != nil {
		return nil, fmt.Errorf("escape producer xml: %w", err)
	}

	var description bytes.Buffer
	description.WriteString("<dc:format>application/pdf</dc:format>\n")
	fmt.Fprintf(
		&description,
		"<dc:title><rdf:Alt><rdf:li xml:lang=\"x-default\">%s</rdf:li></rdf:Alt></dc:title>\n",
		title.String(),
	)
	fmt.Fprintf(&description, "<pdf:Producer>%s</pdf:Producer>\n", producer.String())
	fmt.Fprintf(&description, "<xmp:CreatorTool>%s</xmp:CreatorTool>\n", creator.String())
	if createDate != "" {
		fmt.Fprintf(&description, "<xmp:CreateDate>%s</xmp:CreateDate>\n", createDate)
	}
	if modifyDate != "" {
		fmt.Fprintf(&description, "<xmp:ModifyDate>%s</xmp:ModifyDate>\n", modifyDate)
		fmt.Fprintf(&description, "<xmp:MetadataDate>%s</xmp:MetadataDate>\n", modifyDate)
	}

	metadata := fmt.Sprintf(
		`<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:pdfaid="http://www.aiim.org/pdfa/ns/id/">
<pdfaid:part>2</pdfaid:part>
<pdfaid:conformance>B</pdfaid:conformance>
</rdf:Description>
<rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:pdf="http://ns.adobe.com/pdf/1.3/">
%s</rdf:Description>
</rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`,
		description.String(),
	)

	return []byte(metadata), nil
}

func normalizeOptionalXMPDate(pdfDate string) (string, error) {
	if pdfDate == "" {
		return "", nil
	}
	return toXMPDate(pdfDate)
}

func toXMPDate(pdfDate string) (string, error) {
	s := strings.TrimPrefix(pdfDate, "D:")
	s = strings.ReplaceAll(s, "'", "")
	if len(s) != len("20060102150405-0700") {
		return "", fmt.Errorf("%w: %q", errUnexpectedPDFDate, pdfDate)
	}
	parsed, err := time.Parse("20060102150405-0700", s)
	if err != nil {
		return "", fmt.Errorf("parse pdf date %q: %w", pdfDate, err)
	}
	return parsed.Format(time.RFC3339), nil
}

func buildMetadataObject(metadata []byte) []byte {
	return fmt.Appendf(
		nil,
		"<</Type /Metadata\n/Subtype /XML\n/Length %d>>\nstream\n%s\nendstream",
		len(metadata),
		metadata,
	)
}

func buildOutputIntentObject(iccObject int) []byte {
	return fmt.Appendf(
		nil,
		"<</Type /OutputIntent\n/S /GTS_PDFA1\n/OutputConditionIdentifier (sRGB2014)\n/Info (sRGB2014)\n/RegistryName (https://www.color.org)\n/DestOutputProfile %d 0 R>>",
		iccObject,
	)
}

func buildICCProfileObject() []byte {
	profile := srgbICCProfile()
	return fmt.Appendf(nil, "<</N 3\n/Alternate /DeviceRGB\n/Length %d>>\nstream\n%s\nendstream", len(profile), profile)
}
