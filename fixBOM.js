import fs from 'fs';
import path from 'path';

function removeBOM(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'dist') {
        removeBOM(fullPath);
      }
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.json', '.js', '.jsx', '.ts', '.tsx', '.cjs', '.mjs', '.css', '.html', '.md'].includes(ext)) {
        const buf = fs.readFileSync(fullPath);
        if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
          console.log('Removing BOM from:', fullPath);
          fs.writeFileSync(fullPath, buf.slice(3));
        }
      }
    }
  }
}

removeBOM('.');
