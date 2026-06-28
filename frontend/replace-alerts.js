const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace alerts
  content = content.replace(/alert\(\(err as Error\)\.message\)/g, 'AppAlert.error((err as Error).message)');
  content = content.replace(/alert\(`Discovery failed:(.*?)`\)/g, 'AppAlert.error(`Discovery failed:$1`)');
  content = content.replace(/alert\('Add steps first'\)/g, "AppAlert.warning('Add steps first')");
  content = content.replace(/alert\('Agent added successfully!'\)/g, "AppAlert.success('Agent added successfully!')");
  content = content.replace(/alert\('Failed to add agent: ' \+ \(err as Error\)\.message\)/g, "AppAlert.error('Failed to add agent: ' + (err as Error).message)");
  content = content.replace(/alert\(`Scanned and found (.*?)`\)/g, 'AppAlert.info(`Scanned and found $1`)');
  content = content.replace(/alert\(`Discovered (.*?)`\)/g, 'AppAlert.success(`Discovered $1`)');
  content = content.replace(/alert\(err\.message\)/g, "AppAlert.error(err.message)");

  // Replace Loading...
  content = content.replace(/<p className="[^"]*">Loading\.\.\.<\/p>/g, '<Spinner />');
  content = content.replace(/<p className="[^"]*">\s*Loading\.\.\.\s*<\/p>/g, '<Spinner />');
  content = content.replace(/<div className="[^"]*">Loading builder\.\.\.<\/div>/g, '<Spinner />');
  content = content.replace(/<p className="[^"]*">Loading pipelines\.\.\.<\/p>/g, '<Spinner />');
  
  if (content !== original) {
    // Add imports if needed
    if (content.includes('AppAlert') && !content.includes('@/lib/alert')) {
      content = `import { AppAlert } from '@/lib/alert';\n` + content;
    }
    if (content.includes('<Spinner />') && !content.includes('@/components/Spinner')) {
      content = `import { Spinner } from '@/components/Spinner';\n` + content;
    }

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
}

const dir = 'c:\\Project_Orchestrator\\frontend\\src\\app\\(app)';
function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (f.endsWith('.tsx')) processFile(full);
  }
}
walk(dir);
