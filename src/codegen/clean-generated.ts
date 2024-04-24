import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { promisify } from 'util';

// Promisify for promise-based functions
const globPromise = promisify(glob);
const readdirPromise = promisify(fs.readdir);
const unlinkPromise = promisify(fs.unlink);
const rmdirPromise = promisify(fs.rmdir);

// Custom argument parsing to check for the --empty-only flag
const parseArgs = (): { emptyOnly: boolean } => {
  const args = process.argv.slice(2);
  const emptyOnly = args.includes('--empty-only');
  return { emptyOnly };
};

const { emptyOnly } = parseArgs();

async function deleteGenerated(): Promise<void> {
  try {
    const files = await globPromise(`${__dirname}/../layout/**/*generated*.*`, { nodir: true });

    for (const file of files) {
      const dir = path.dirname(file);

      if (emptyOnly) {
        const filesInDir = await readdirPromise(dir);
        const nonGeneratedFiles = filesInDir.filter((f) => !f.includes('generated'));

        if (nonGeneratedFiles.length === 0) {
          await unlinkPromise(file);
          console.log(`Deleted '${file}' as its directory contains only generated files.`);

          // If this was the last file, attempt to delete the containing directory
          const updatedFilesInDir = await readdirPromise(dir);
          if (updatedFilesInDir.length === 0) {
            await rmdirPromise(dir);
            console.log(`Deleted empty directory '${dir}'.`);
          }
        }
      } else {
        await unlinkPromise(file);
        console.log(`Deleted '${file}'.`);
      }
    }
  } catch (error) {
    console.error('Error deleting files or directories:', error);
  }
}

deleteGenerated();
