const fs = require('fs');
const path = require('path');

const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) {
  throw new Error('API_BASE_URL must be set to the deployed HTTPS backend URL ending in /api');
}

let parsedApiUrl;
try {
  parsedApiUrl = new URL(apiBaseUrl);
} catch {
  throw new Error('API_BASE_URL must be a valid absolute URL');
}

const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);
if (
  parsedApiUrl.protocol !== 'https:'
  || localHosts.has(parsedApiUrl.hostname)
  || !parsedApiUrl.pathname.replace(/\/+$/, '').endsWith('/api')
  || parsedApiUrl.search
  || parsedApiUrl.hash
) {
  throw new Error('Production API_BASE_URL must use HTTPS, must not be a local URL, and must end in /api');
}

const projectRoot = path.resolve(__dirname, '..');
const publicDirectory = path.join(projectRoot, 'public');
const outputDirectory = path.join(projectRoot, 'dist');
fs.rmSync(outputDirectory, { recursive: true, force: true });
fs.cpSync(publicDirectory, outputDirectory, { recursive: true });

const indexPath = path.join(outputDirectory, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');
const configTag = `<script>window.CLASSVOICE_API_BASE = ${JSON.stringify(apiBaseUrl.replace(/\/+$/, ''))};</script>`;
const updatedHtml = indexHtml.replace(
  /<script>window\.CLASSVOICE_API_BASE = window\.CLASSVOICE_API_BASE \|\| '\/api';<\/script>/,
  configTag,
);
if (updatedHtml === indexHtml) {
  throw new Error('Unable to find the frontend API configuration placeholder in public/index.html');
}
fs.writeFileSync(indexPath, updatedHtml);
console.log(`Frontend built in dist with API ${parsedApiUrl.origin}${parsedApiUrl.pathname}`);
