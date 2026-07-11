const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, 'docs');
const OUTPUT = path.join(DOCS_DIR, 'search-index.json');

function findMarkdownFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findMarkdownFiles(full, files);
    } else if (
      entry.name.endsWith('.md') &&
      !entry.name.startsWith('_') &&
      entry.name !== '_sidebar.md' &&
      entry.name !== '_navbar.md' &&
      entry.name !== '_footer.md'
    ) {
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

function slugify(text) {
  return text.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
}

function parseMarkdown(content, route) {
  const sections = {};
  const lines = content.split('\n');
  let currentTitle = null;
  let currentSlug = null;
  let currentBody = [];

  function flush() {
    if (currentSlug) {
      const body = stripWikiMarkup(currentBody.join('\n').trim());
      sections[currentSlug] = {
        slug: currentSlug,
        title: currentTitle,
        body: body,
      };
    }
  }

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      flush();
      currentTitle = headingMatch[2].trim();
      const id = slugify(currentTitle);
      currentSlug = `#${route}?id=${id}`;
      currentBody = [];
    } else {
      currentBody.push(line);
    }
  }
  flush();

  if (Object.keys(sections).length === 0 && content.trim()) {
    const body = stripWikiMarkup(content.trim());
    const slug = `#${route}`;
    sections[slug] = { slug, title: route.split('/').pop() || 'Home', body };
  }

  return sections;
}

const files = findMarkdownFiles(DOCS_DIR);
const index = {};

for (const file of files) {
  const relative = file.replace(DOCS_DIR, '').replace(/\.md$/, '');
  const route = relative.replace(/\/README$/, '/');
  const sections = parseMarkdown(fs.readFileSync(file, 'utf-8'), route);
  if (Object.keys(sections).length > 0) {
    index[route] = sections;
  }
}

fs.writeFileSync(OUTPUT, JSON.stringify(index));
console.log(`Search index built: ${Object.keys(index).length} pages indexed`);
