const fs = require('fs');
const path = require('path');

const walkSync = (dir, filelist = []) => {
  fs.readdirSync(dir).forEach(file => {
    filelist = fs.statSync(path.join(dir, file)).isDirectory()
      ? walkSync(path.join(dir, file), filelist)
      : filelist.concat(path.join(dir, file));
  });
  return filelist;
}

const files = walkSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Remove 'use client'
  content = content.replace(/['"]use client['"];?\n?/gi, '');

  // Next/Link -> react-router-dom Link
  content = content.replace(/import\s+Link\s+from\s+['"]next\/link['"];?/g, 'import { Link } from "react-router-dom";');

  // Next/Navigation -> react-router-dom 
  content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"]next\/navigation['"];?/g, (match, p1) => {
    let imports = p1.trim().split(',').map(s => s.trim());
    let newImports = [];
    if (imports.includes('useRouter') || imports.includes('redirect')) newImports.push('useNavigate');
    if (imports.includes('usePathname')) newImports.push('useLocation');
    // If there is anything else, mostly ignore or map 
    if (newImports.length > 0) return `import { ${[...new Set(newImports)].join(', ')} } from "react-router-dom";`;
    return '';
  });

  // Next/Image -> img
  content = content.replace(/import\s+Image\s+from\s+['"]next\/image['"];?/g, '');
  content = content.replace(/<Image([^>]+)>/g, '<img$1 />');

  // Next/Dynamic -> default import or ignore (hacky but works for this level)
  content = content.replace(/import\s+dynamic\s+from\s+['"]next\/dynamic['"];?/g, 'import { lazy, Suspense } from "react";\nconst dynamic = (fn, options) => { const Component = lazy(fn); return (props) => <Suspense fallback={<div>Loading...</div>}><Component {...props} /></Suspense>; };');

  // Next/headers -> ignore
  content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"]next\/headers['"];?/g, '/* Removed next/headers import */');
  
  // Remove Next/cache
  content = content.replace(/import\s+\{([^}]*)\}\s+from\s+['"]next\/cache['"];?/g, '/* Removed next/cache import */');

  // Replace useRouter() with useNavigate()
  content = content.replace(/const\s+(\w+)\s*=\s*useRouter\(\)/g, 'const $1 = useNavigate()');
  // Usually router.push('/xyz') becomes navigate('/xyz')
  content = content.replace(/\.push\(/g, '('); // This relies on router mapped to navigate. Wait.
  // Better:
  // if `const router = useNavigate()`, then `router.push('/xyz')` will break. react-router navigate doesn't have .push.
  // Let's explicitly replace router.push with navigate.
  content = content.replace(/useRouter\(\)/g, 'useNavigate()');
  content = content.replace(/router\.push\(/g, 'navigate(');
  content = content.replace(/const\s+router\s*=\s*/g, 'const navigate = ');

  // Replace usePathname() with useLocation().pathname
  content = content.replace(/usePathname\(\)/g, 'useLocation().pathname');

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Processed', file);
  }
});
