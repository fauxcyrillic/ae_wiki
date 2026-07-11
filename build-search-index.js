const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, 'docs');
const OUTPUT = path.join(DOCS_DIR, 'search-index.json');

function findMarkdownFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(full, files);
    } else if (entry.name.endsWith('.md') && !entry.name.startsWith('_')) {
      files.push(full);
    }
  }
  return files;
}

function stripWikiMarkup(text) {
  text = text.replace(/\[\[\s*img\s*\|[^\]]*?\]\]/g, '');
  text = text.replace(/\[\[\s*\S+?\s*\|\s*([^\]]+?)\s*\]\]/g, '$1');
  text = text.replace(/\[\[\s*([^\]]+?)\s*\]\]/g, '$1');
  return text;
}

function extractTitle(content, fallback) {
  const match = content.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : fallback;
}

function extractBody(content) {
  return stripWikiMarkup(content.replace(/^#+\s+.+$/gm, '').trim());
}

function fileToRoute(file) {
  const relative = file.replace(DOCS_DIR, '').replace(/\.md$/, '');
  return relative.replace(/\/README$/, '/');
}

const files = findMarkdownFiles(DOCS_DIR);
const index = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const route = fileToRoute(file);
  const fallbackName = path.basename(file, '.md');
  const title = extractTitle(content, fallbackName === 'README' ? route : fallbackName);
  const body = extractBody(content);

  index.push({
    title: title,
    url: '#' + route,
    body: body,
  });
}

index.sort((a, b) => a.title.localeCompare(b.title));

fs.writeFileSync(OUTPUT, JSON.stringify(index));
console.log(`Search index built: ${index.length} pages indexed`);
