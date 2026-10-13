const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const dir = path.resolve(__dirname, '..', 'app', 'assets');
fs.mkdirSync(dir, {recursive:true});
const ink='#44382f', cream='#f6efdc', pale='#e6d9bb', ochre='#d0a04c', toast='#bd9063', rose='#d59c8f', olive='#7d886d';
const head=`<path d="M311 280 Q296 248 304 207 Q307 190 325 208 L348 239 Q386 218 425 230 L446 206 Q461 197 458 225 L456 257 Q489 279 486 320 Q487 347 467 366 C488 408 493 455 472 492 Q457 519 423 515 L345 515 Q307 518 296 480 Q282 431 309 383 Q290 366 290 326 Q289 298 311 280Z" fill="${cream}" stroke="${ink}" stroke-width="4"/>
<path d="M314 212 L322 259 Q331 252 339 249Z M450 216 L435 247 L449 252Z" fill="${rose}" opacity=".73"/>
<path d="M311 282 L328 273 M458 256 L466 269" fill="none" stroke="${ink}" stroke-width="3"/>
<ellipse cx="386" cy="452" rx="52" ry="49" fill="#f0dfc8" opacity=".63"/>
<path d="M307 375 Q390 400 475 365 L476 385 Q393 420 303 391Z" fill="${ochre}" stroke="${ink}" stroke-width="3.5"/>
<path d="M419 398 Q429 423 455 455 Q449 467 437 465 L411 409Z" fill="${ochre}" stroke="${ink}" stroke-width="3.5"/>
<path d="M433 439 L447 435" fill="none" stroke="${ink}" stroke-width="2.5"/>
<path d="M372 477 Q358 488 355 505 Q368 515 384 507 M426 475 Q441 484 441 502 Q424 515 410 505" fill="${cream}" stroke="${ink}" stroke-width="3.5"/>
<path d="M352 490 Q341 484 332 493 Q325 502 335 509 Q347 518 359 510 L361 499Z" fill="${toast}" stroke="${ink}" stroke-width="3.5"/>
<path d="M337 503 L338 508 M345 501 L347 508 M418 500 L418 508 M427 499 L429 505" fill="none" stroke="${ink}" stroke-width="2"/>
<path d="M337 305 Q347 302 354 305 M426 299 Q433 295 439 298" fill="none" stroke="${ink}" stroke-width="2.6"/>
<ellipse cx="351" cy="323" rx="4.4" ry="5.8" fill="${ink}"/><ellipse cx="431" cy="317" rx="4" ry="5.5" fill="${ink}"/>
<ellipse cx="337" cy="344" rx="14" ry="7" fill="${rose}" opacity=".43"/><ellipse cx="447" cy="337" rx="13" ry="6" fill="${rose}" opacity=".43"/>
<path d="M385 337 Q393 334 399 339 L392 345Z" fill="${rose}"/>
<path d="M392 345 L392 352 Q387 358 381 353 M392 352 Q399 357 404 351" fill="none" stroke="${ink}" stroke-width="2.6"/>
<path d="M314 337 L293 332 M317 347 L291 348 M463 331 L482 323 M464 341 L488 338" fill="none" stroke="${ink}" stroke-width="2.3"/>
<path d="M382 431 L388 442 L401 444 L391 453 L392 466 L381 460 L369 465 L372 452 L363 442 L377 441Z" fill="${ochre}" stroke="${ink}" stroke-width="2.6" transform="rotate(-9 383 449)"/>
<path d="M372 448 L373 456 M381 437 L387 444 M390 457 L389 461" stroke="${cream}" stroke-width="2"/>`;
const hero=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 768" width="768" height="768"><g stroke-linecap="round" stroke-linejoin="round">
<path d="M529 227 C397 168 257 221 187 344 C121 458 183 602 326 652 C443 693 554 630 592 520 C483 572 389 534 349 450 C306 360 373 265 529 227Z" fill="${ochre}" stroke="${ink}" stroke-width="4.5"/>
<path d="M211 379 Q183 457 220 525 M229 545 L245 562 M254 573 L267 583" fill="none" stroke="#b3823e" stroke-width="3"/>
<path d="M487 241 Q464 245 443 255" fill="none" stroke="${cream}" stroke-width="3" opacity=".7"/>
<path d="M310 449 C257 475 224 435 240 408 C251 389 277 387 285 406" fill="none" stroke="${ink}" stroke-width="35"/>
<path d="M310 449 C257 475 224 435 240 408 C251 389 277 387 285 406" fill="none" stroke="${cream}" stroke-width="27"/>
${head}
<path d="M224 632 Q221 605 233 582" fill="none" stroke="${ink}" stroke-width="3"/>
<path d="M227 608 Q203 594 205 579 Q224 580 229 600 M230 597 Q251 574 263 580 Q260 600 232 607 M224 621 Q198 614 194 602 Q214 600 226 616" fill="${olive}" stroke="${ink}" stroke-width="2.4"/>
<path d="M249 182 L256 197 L272 198 L260 209 L261 225 L247 217 L233 223 L237 207 L226 196 L243 195Z" fill="${ochre}" stroke="${ink}" stroke-width="2.8" transform="rotate(-8 249 203)"/>
<path d="M561 329 L565 340 L577 345 L565 349 L561 361 L556 349 L545 345 L556 340Z" fill="${cream}" stroke="${ink}" stroke-width="2.5"/>
<path d="M532 613 L537 621 M550 601 L554 605 M272 253 L275 260" fill="none" stroke="${ink}" stroke-width="3"/>
<circle cx="559" cy="584" r="3" fill="${rose}"/><circle cx="215" cy="270" r="3.5" fill="${olive}"/><circle cx="600" cy="395" r="2.5" fill="${ochre}"/>
</g></svg>`;

const number=v=>Number(v.toFixed(2));
// Right-facing anatomy: the cat's left side is nearest the viewer.
// LF = left foreleg / near front; RH = right hindleg / far hind: phase 0.
// RF = right foreleg / far front; LH = left hindleg / near hind: phase PI.
// Each diagonal moves together; both same-side front/hind pairs oppose.
const limbs=[
  {name:'RH',label:'right hind / far hind',hip:100,offset:0,near:false,hind:true},
  {name:'RF',label:'right fore / far front',hip:172,offset:Math.PI,near:false,hind:false},
  {name:'LH',label:'left hind / near hind',hip:88,offset:Math.PI,near:true,hind:true},
  {name:'LF',label:'left fore / near front',hip:185,offset:0,near:true,hind:false}
];
function leg(limb, phase, bob) {
  const cycle=((phase+limb.offset)/(Math.PI*2)%1+1)%1;
  const stance=cycle<.6;
  const u=stance?cycle/.6:(cycle-.6)/.4;
  const swing=stance?13-26*u:-13+26*(.5-.5*Math.cos(u*Math.PI));
  const lift=stance?0:Math.sin(u*Math.PI)*12;
  const footx=number(limb.hip+swing), sole=number(230-lift);
  const hipY=number(194+bob), kneeX=number(limb.hip+swing*.34+(limb.hind?3:-2));
  const kneeY=number(216-lift*.48), tint=limb.near?cream:'#e9e0cc';
  // The torso covers these generous rounded hip caps. Only a short bent calf
  // and a little oval paw show below the belly; no detached rectangular limbs.
  return `<g data-limb="${limb.name}" data-anatomy="${limb.label}" data-phase="${limb.offset===0?'0':'PI'}" data-stance="${stance}" data-sole="${sole}">
    <path d="M${limb.hip-9} ${hipY} Q${kneeX-10} ${kneeY-4} ${footx-6} ${sole-8}
      C${footx-12} ${sole-6} ${footx-12} ${sole} ${footx-4} ${sole}
      L${footx+9} ${sole} Q${footx+16} ${sole} ${footx+13} ${sole-5}
      Q${footx+11} ${sole-9} ${footx+4} ${sole-9}
      Q${kneeX+8} ${kneeY-2} ${limb.hip+9} ${hipY}Z" fill="${tint}" stroke="${ink}" stroke-width="2.35"/>
    ${limb.near?`<path d="M${footx+2} ${sole-4} L${footx+2} ${sole-1.5} M${footx+8} ${sole-4} L${footx+8} ${sole-1.5}" fill="none" stroke="${ink}" stroke-width="1.35"/>`:''}
  </g>`;
}
function walker(i) {
  const phase=i*Math.PI/4, tail=Math.sin(phase-Math.PI/4)*3.4;
  const bob=Math.sin(phase*2)*.6, headTilt=Math.sin(phase)*.45;
  return `<g transform="translate(${(i%4)*256} ${Math.floor(i/4)*256})" stroke-linecap="round" stroke-linejoin="round" data-frame="${i}">
  ${limbs.map(limb=>leg(limb,phase,bob)).join('')}
  <g transform="translate(0 ${number(bob)})">
    <path d="M83 181 C57 181 47 163 50 ${151+tail} C53 ${137+tail} 64 ${135+tail} 69 ${145+tail}" fill="none" stroke="${ink}" stroke-width="19"/>
    <path d="M83 181 C57 181 47 163 50 ${151+tail} C53 ${137+tail} 64 ${135+tail} 69 ${145+tail}" fill="none" stroke="${cream}" stroke-width="14"/>
    <path d="M83 173 C96 156 124 153 146 160 C161 157 180 165 188 180
      C198 195 189 207 174 210 Q151 216 122 211
      Q98 216 81 207 C69 199 70 183 83 173Z" fill="${cream}" stroke="${ink}" stroke-width="2.6"/>
    <path d="M100 190 C108 178 131 178 146 187 Q165 197 159 208 Q134 215 110 207Z" fill="#eedfc5" opacity=".82"/>
    <path d="M85 177 Q90 173 96 173 M80 188 Q79 193 81 196" fill="none" stroke="#b8a78b" stroke-width="1.3" opacity=".72"/>
    <g transform="rotate(${number(headTilt)} 173 166)">
      <path d="M139 116 Q139 107 143 94 Q146 86 152 94 L163 108
        Q177 102 191 107 L207 94 Q214 90 214 100 L213 116
        C226 127 232 144 225 159 C219 175 202 185 183 185
        C160 186 140 176 134 160 Q127 142 139 116Z" fill="${cream}" stroke="${ink}" stroke-width="2.6"/>
      <path d="M147 98 Q144 104 145 114 L155 110Z M209 100 L199 111 L210 116Z" fill="${rose}" opacity=".58"/>
      <path d="M140 124 Q143 121 146 121 M214 121 L218 125" fill="none" stroke="#b8a78b" stroke-width="1.3"/>
      <path d="M139 169 Q163 186 195 179 L194 189 Q163 198 138 181Z" fill="${ochre}" stroke="${ink}" stroke-width="2.1"/>
      <path d="M159 189 Q157 204 149 212 Q155 217 163 214 L174 192Z" fill="${ochre}" stroke="${ink}" stroke-width="2.1"/>
      <path d="M153 208 L162 211" fill="none" stroke="#a87c3b" stroke-width="1.4"/>
      <ellipse cx="183" cy="141" rx="2.55" ry="3.4" fill="${ink}"/>
      <ellipse cx="212" cy="140" rx="1.85" ry="3" fill="${ink}"/>
      <path d="M177 132 Q182 130 186 132" fill="none" stroke="${ink}" stroke-width="1.6"/>
      <ellipse cx="173" cy="153" rx="9" ry="4.5" fill="${rose}" opacity=".38"/>
      <ellipse cx="218" cy="150" rx="4.8" ry="3.3" fill="${rose}" opacity=".23"/>
      <path d="M211 153 Q216 151 219 154 L215 158Z" fill="${rose}"/>
      <path d="M215 158 Q214 164 208 163 Q204 163 201 160" fill="none" stroke="${ink}" stroke-width="1.7"/>
      <path d="M193 153 L182 150 M194 160 L183 163" fill="none" stroke="${ink}" stroke-width="1.45"/>
    </g>
    <path d="M122 187 L125 192 L131 193 L127 197 L127 203 L122 200 L117 203 L118 197 L114 193 L120 192Z" fill="${ochre}" stroke="${ink}" stroke-width="1.45"/>
    <path d="M121 192 L123 195" stroke="${cream}" stroke-width="1.25"/>
  </g></g>`;
}
const sheet=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 512" width="1024" height="512">${Array.from({length:8},(_,i)=>walker(i)).join('')}</svg>`;
(async()=>{
  const spritesOnly=process.argv.includes('--sprites-only');
  if(!spritesOnly)fs.writeFileSync(path.join(dir,'mooncat-art.svg'), hero, 'utf8');
  fs.writeFileSync(path.join(dir,'cat-walk.svg'), sheet, 'utf8');
  if(!spritesOnly)await sharp(Buffer.from(hero),{density:96}).resize(768,768).png().toFile(path.join(dir,'mooncat-art.png'));
  await sharp(Buffer.from(sheet),{density:96}).resize(1024,512).png().toFile(path.join(dir,'cat-walk.png'));
  console.log(JSON.stringify({hero:await sharp(path.join(dir,'mooncat-art.png')).metadata(),walk:await sharp(path.join(dir,'cat-walk.png')).metadata()},null,2));
})();
