import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { promisify } from 'util';

// Use promisify to create promise-based variants of these functions
const globPromise = promisify(glob);
const readdirPromise = promisify(fs.readdir);
const unlinkPromise = promisify(fs.unlink);

// Parse command-line arguments to get the `empty-only` flag
const parseArgs = (): { emptyOnly: boolean } => {
  const args = process.argv.slice(2);
  const emptyOnlyIndex = args.indexOf('--empty-only');
  return { emptyOnly: emptyOnlyIndex !== -1 };
};

const { emptyOnly } = parseArgs();

async function deleteGenerated(): Promise<void> {
  try {
    const files: string[] = await globPromise(`${__dirname}/../layout/**/*generated*.*`, { nodir: true });

    for (const file of files) {
      const dir = path.dirname(file);

      if (emptyOnly) {
        const filesInDir = await readdirPromise(dir);
        const nonGeneratedFiles = filesInDir.filter((f) => !f.includes('generated'));

        if (nonGeneratedFiles.length === 0) {
          // Only generated files in the directory
          await unlinkPromise(file);
          console.log(`Deleted '${file}' as its directory contains only generated files.`);
        }
      } else {
        await unlinkPromise(file);
        console.log(`Deleted '${file}'.`);
      }
    }
  } catch (error) {
    console.error('Error deleting files:', error);
  }
}

deleteGenerated();
