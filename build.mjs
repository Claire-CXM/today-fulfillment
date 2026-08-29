import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const output = join(root, 'dist');
const files = ['index.html', 'app.js', 'analytics.js', 'logic.js', 'storage.js', 'cloud-sync.js', 'supabase-client.js', 'styles.css', 'sw.js', 'manifest.webmanifest', 'icon.svg'];

await mkdir(output, { recursive: true });
await Promise.all(files.map(file => cp(join(root, file), join(output, file), { force: true })));
await cp(join(root, 'assets'), join(output, 'assets'), { recursive: true, force: true });
await mkdir(join(output, 'node_modules', '@ionic'), { recursive: true });
await cp(join(root, 'node_modules', '@ionic', 'core'), join(output, 'node_modules', '@ionic', 'core'), { recursive: true, force: true });
await mkdir(join(output, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd'), { recursive: true });
await cp(join(root, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'), join(output, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js'), { force: true });

console.log('静态发布包已生成：dist/');
