const fs = require('fs');

const code = fs.readFileSync('./lib/hairstyleData.ts', 'utf8');
const regex = /name:\s*["']([^"']+)["'],\s*category:\s*["']([^"']+)["'][\s\S]*?hairTexture:\s*["']([^"']+)["'],\s*maintenance:\s*["']([^"']+)["'],\s*length:\s*["']([^"']+)["']/g;

const list = [];
let match;
while ((match = regex.exec(code)) !== null) {
  list.push({
    name: match[1],
    category: match[2],
    hairTexture: match[3],
    maintenance: match[4],
    length: match[5]
  });
}

console.log('Total extracted:', list.length);
const textures = {};
list.forEach(item => {
  textures[item.hairTexture] = (textures[item.hairTexture] || 0) + 1;
});
console.log('Unique hair textures:', textures);
