import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const source = path.resolve('assets/brand/form-master');
const destination = path.resolve('public/brand');
const palette = JSON.parse(fs.readFileSync(path.resolve('src/data/brand-palette.json'), 'utf8'));
const recolor = svg => svg.replace(/#4d3147/gi, palette.ink).replace(/#f0e9df/gi, palette.paper);
fs.mkdirSync(destination, {recursive:true});
for (const [from,to] of [['logo-horizontal-murdum.svg','logo-form.svg'],['logo-horizontal-ters.svg','logo-form-ters.svg']]) {
  const content=recolor(fs.readFileSync(path.join(source,from),'utf8')
    .replace(/width="\d+" height="\d+" viewBox="[^"]+"/,'width="558" height="97" viewBox="28 28 557.193 97"'));
  fs.writeFileSync(path.join(destination,to),content);
}
const emblem=recolor(fs.readFileSync(path.join(source,'amblem-ters.svg'),'utf8'));
const favicon=emblem.replace(/width="168" height="145"/,'width="180" height="180"')
  .replace(/viewBox="[^"]+"/,'viewBox="-12 -18.5 192 192"')
  .replace('</title>',`</title><rect x="-12" y="-18.5" width="192" height="192" fill="${palette.ink}"/>`);
fs.writeFileSync(path.join(destination,'favicon.svg'),favicon);
fs.writeFileSync(path.resolve('src/app/icon.svg'),favicon);
await sharp(Buffer.from(favicon)).resize(180,180).png().toFile(path.join(destination,'apple-touch-icon.png'));
const logo=fs.readFileSync(path.join(destination,'logo-form-ters.svg'),'utf8');
const og=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${palette.ink}"/><rect x="540" y="102" width="120" height="3" fill="${palette.metal}"/><image x="165" y="180" width="870" height="151" href="data:image/svg+xml;base64,${Buffer.from(logo).toString('base64')}"/><text x="600" y="435" text-anchor="middle" font-family="Georgia,serif" font-size="48" fill="${palette.paper}">Her açıdan özgün.</text></svg>`;
await sharp(Buffer.from(og)).png().toFile(path.join(destination,'sehpaciyiz-paylasim.png'));
fs.writeFileSync(path.join(destination, 'palette.json'), JSON.stringify(palette, null, 2));
const cssFile = path.resolve('src/app/(store)/form-brand.css');
const cssTokens = {
  'brand-ink': palette.ink,
  'brand-paper': palette.paper,
  'brand-text': palette.text,
  'brand-metal': palette.metal,
  'brand-mist': palette.mist,
  'brand-sand': palette.sand,
  bg: palette.background,
  muted: palette.muted,
  line: palette.line,
};
let css = fs.readFileSync(cssFile, 'utf8');
for (const [token, value] of Object.entries(cssTokens)) {
  const pattern = new RegExp(`(--${token}:\\s*)#[a-f0-9]{3,8}\\b`, 'gi');
  css = css.replace(pattern, (_, prefix) => prefix + value.toLowerCase());
}
fs.writeFileSync(cssFile, css);
console.log('Current Form palette applied to logos, favicon, Apple icon and social preview.');
