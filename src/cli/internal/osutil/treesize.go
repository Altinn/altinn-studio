package osutil

import (
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
)

var errTreeRootNotDir = errors.New("not a directory")

// TreeSize is the number of bytes in regular files under a directory, or why it could not be measured.
type TreeSize struct {
	// Err is set when part of the tree could not be read; Bytes is then a lower bound, not a size.
	Err   error
	Bytes int64
}

// MeasureTree sums the apparent sizes of regular files under root in a single walk, and reports how
// much of that lies under each of parts, given as paths relative to root. A file counts towards the
// innermost part containing it. A missing root or part measures zero bytes.
//
// Root itself is resolved if it is a symbolic link; nothing below it is: links are neither followed nor
// counted, so the walk never leaves root. Entries removed while the walk runs are skipped, since other
// processes may be pruning the tree concurrently. Any other error marks the tree and the part it
// occurred in as failed, and the walk carries on with the rest.
func MeasureTree(root string, parts []string) (TreeSize, []TreeSize) {
	w := newTreeWalk(parts)
	w.measure(root)
	return w.total, w.sizes
}

type treeWalk struct {
	total   TreeSize
	readDir func(name string) ([]fs.DirEntry, error)
	parts   map[string]int
	sizes   []TreeSize
	reached []bool
}

func newTreeWalk(parts []string) *treeWalk {
	w := &treeWalk{
		readDir: os.ReadDir,
		parts:   make(map[string]int, len(parts)),
		sizes:   make([]TreeSize, len(parts)),
		reached: make([]bool, len(parts)),
		total:   TreeSize{Err: nil, Bytes: 0},
	}
	for i, part := range parts {
		w.parts[filepath.Clean(part)] = i
	}
	return w
}

func (w *treeWalk) measure(root string) {
	info, err := os.Stat(root)
	switch {
	case errors.Is(err, fs.ErrNotExist):
		return
	case err != nil:
		w.failRoot(fmt.Errorf("measure tree: %w", err))
	case !info.IsDir():
		w.failRoot(fmt.Errorf("%s: %w", root, errTreeRootNotDir))
	default:
		w.walkDir(root, "", -1)
		w.settleUnreachedParts(root)
	}
}

// failRoot fails the tree and every part: nothing below a root that cannot be walked is measured.
func (w *treeWalk) failRoot(err error) {
	w.total.Err = err
	for i := range w.sizes {
		w.sizes[i].Err = err
	}
}

// walkDir adds the files below dir, whose path relative to the root is rel, to the total and to part
// (-1 for none).
func (w *treeWalk) walkDir(dir, rel string, part int) {
	entries, err := w.readDir(dir)
	if err != nil {
		if !errors.Is(err, fs.ErrNotExist) {
			w.fail(part, fmt.Errorf("list directory: %w", err))
		}
		// os.ReadDir returns the entries it read before failing; they are still worth counting.
	}

	for _, entry := range entries {
		entryRel := filepath.Join(rel, entry.Name())
		entryPart := part
		if i, ok := w.parts[entryRel]; ok {
			entryPart = i
			w.reached[i] = true
		}

		// DirEntry.Type comes from the directory listing and never follows a symbolic link.
		if entry.IsDir() {
			w.walkDir(filepath.Join(dir, entry.Name()), entryRel, entryPart)
			continue
		}
		if !entry.Type().IsRegular() {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			if !errors.Is(err, fs.ErrNotExist) {
				w.fail(entryPart, fmt.Errorf("measure file: %w", err))
			}
			continue
		}
		w.add(entryPart, info.Size())
	}
}

// settleUnreachedParts fails the parts the walk never listed although they exist: an unreadable
// ancestor hid them, so their zero is not a measurement.
func (w *treeWalk) settleUnreachedParts(root string) {
	if w.total.Err == nil {
		return
	}
	for rel, i := range w.parts {
		if w.reached[i] || w.sizes[i].Err != nil {
			continue
		}
		if _, err := os.Lstat(filepath.Join(root, rel)); errors.Is(err, fs.ErrNotExist) {
			continue
		}
		w.sizes[i].Err = w.total.Err
	}
}

func (w *treeWalk) add(part int, size int64) {
	w.total.Bytes += size
	if part >= 0 {
		w.sizes[part].Bytes += size
	}
}

func (w *treeWalk) fail(part int, err error) {
	if w.total.Err == nil {
		w.total.Err = err
	}
	if part >= 0 && w.sizes[part].Err == nil {
		w.sizes[part].Err = err
	}
}
