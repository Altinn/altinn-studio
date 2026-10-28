package localtestv2

import (
	"bytes"
	"errors"
	"fmt"
	"io/fs"
	"os"
	"path"

	"altinn.studio/studioctl/internal/localtestv2/manifest"
	"altinn.studio/studioctl/internal/osutil"
)

// ensureFiles writes the files that ship with the manifest into dir, at their paths relative to the manifest's
// directory, where the containers' files are bind-mounted from (containerVolumes). A file whose content is already
// there is left alone, and a changed one is rewritten in place, so a running container's mount keeps pointing at it;
// what no longer ships is removed. Everything is world-readable on purpose: the containers run as their image users,
// not as the developer.
func ensureFiles(dir string, m *manifest.Manifest) error {
	if err := os.MkdirAll(dir, osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create the manifest's files directory: %w", err)
	}
	root, err := os.OpenRoot(dir)
	if err != nil {
		return fmt.Errorf("open the manifest's files directory: %w", err)
	}
	return errors.Join(syncFiles(root, m), root.Close())
}

// syncFiles makes root hold exactly the files that ship with the manifest.
func syncFiles(root *os.Root, m *manifest.Manifest) error {
	names := m.ShippedFiles()
	shipped := map[string]bool{}
	for _, name := range names {
		shipped[name] = true
	}
	if err := removeUnshipped(root, shipped); err != nil {
		return err
	}
	if err := root.Chmod(".", osutil.DirPermDefault); err != nil {
		return fmt.Errorf("make the manifest's files directory readable: %w", err)
	}
	for _, name := range names {
		data, err := m.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read the manifest's file: %w", err)
		}
		if err := writeReadable(root, name, data); err != nil {
			return err
		}
	}
	return nil
}

// writeReadable writes data to name (slash-separated, relative to root) unless it holds that already, the folders on
// the way and the file readable by everyone, whatever the umask made of them or an earlier run left.
func writeReadable(root *os.Root, name string, data []byte) error {
	if err := root.MkdirAll(path.Dir(name), osutil.DirPermDefault); err != nil {
		return fmt.Errorf("create the folder of the manifest's file %s: %w", name, err)
	}
	for dir := path.Dir(name); dir != "."; dir = path.Dir(dir) {
		if err := root.Chmod(dir, osutil.DirPermDefault); err != nil {
			return fmt.Errorf("make the folder %s readable: %w", dir, err)
		}
	}
	existing, err := root.ReadFile(name)
	if err != nil || !bytes.Equal(existing, data) {
		if err := root.WriteFile(name, data, osutil.FilePermDefault); err != nil {
			return fmt.Errorf("write the manifest's file %s: %w", name, err)
		}
	}
	if err := root.Chmod(name, osutil.FilePermDefault); err != nil {
		return fmt.Errorf("make the manifest's file %s readable: %w", name, err)
	}
	return nil
}

// removeUnshipped removes what is under dir but does not ship: a file not in shipped, and a folder holding none.
func removeUnshipped(root *os.Root, shipped map[string]bool) error {
	keep := map[string]bool{}
	for name := range shipped {
		for parent := path.Dir(name); parent != "."; parent = path.Dir(parent) {
			keep[parent] = true
		}
	}
	var remove []string
	err := fs.WalkDir(root.FS(), ".", func(name string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if name == "." || (d.IsDir() && keep[name]) || (!d.IsDir() && shipped[name]) {
			return nil
		}
		remove = append(remove, name)
		if d.IsDir() {
			return fs.SkipDir
		}
		return nil
	})
	if err != nil {
		return fmt.Errorf("list the manifest's files directory: %w", err)
	}
	for _, name := range remove {
		if err := root.RemoveAll(name); err != nil {
			return fmt.Errorf("remove %s, which the manifest no longer ships: %w", name, err)
		}
	}
	return nil
}
