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

function leg(x, phase, tint, near) {
  const swing = Math.sin(phase)*11;
  const lift = Math.max(0,Math.cos(phase))*9;
  const footx = x+swing, y=215-lift;
  return `<path d="M${x-8} 180 Q${x-9+swing*.25} 194 ${footx-9} ${y-5} Q${footx-11} ${y+2} ${footx+1} ${y+2} L${footx+9} ${y+2} Q${footx+15} ${y-4} ${footx+8} ${y-8} L${x+10} 180Z" fill="${tint}" stroke="${ink}" stroke-width="2.4"/>${near?`<path d="M${footx+1} ${y-3} L${footx+1} ${y+1} M${footx+7} ${y-3} L${footx+7} ${y}" fill="none" stroke="${ink}" stroke-width="1.7"/>`:''}`;
}
function walker(i) {
  const phase=i*Math.PI/4, tail=Math.sin(phase)*4, bob=Math.sin(phase*2)*.6;
  return `<g transform="translate(${(i%4)*256} ${Math.floor(i/4)*256})" stroke-linecap="round" stroke-linejoin="round">
  <g transform="translate(0 ${bob.toFixed(2)})">
  <path d="M90 161 C56 163 41 141 44 ${119+tail} C46 ${103+tail} 58 ${98+tail} 67 ${108+tail}" fill="none" stroke="${ink}" stroke-width="21"/>
  <path d="M90 161 C56 163 41 141 44 ${119+tail} C46 ${103+tail} 58 ${98+tail} 67 ${108+tail}" fill="none" stroke="${cream}" stroke-width="16"/>
  ${leg(109,phase+Math.PI,pale,false)}${leg(166,phase,pale,false)}
  <path d="M89 140 C111 124 150 123 174 137 C193 148 197 165 186 183 Q176 199 142 196 L107 193 Q79 188 78 169 Q76 150 89 140Z" fill="${cream}" stroke="${ink}" stroke-width="2.6"/>
  <path d="M114 161 Q122 150 143 153 Q166 157 169 181 Q147 192 121 182Z" fill="#efdfc6"/>
  ${leg(95,phase,toast,true)}${leg(174,phase+Math.PI,cream,true)}
  <path d="M140 135 Q126 124 132 102 L137 75 Q139 61 149 76 L158 86 Q167 78 184 83 L198 71 Q208 65 206 80 L205 94 Q224 106 220 125 Q214 145 188 150 Q159 154 140 135Z" fill="${cream}" stroke="${ink}" stroke-width="2.6"/>
  <path d="M140 78 L151 92 L140 98Z M201 77 L190 88 L201 92Z" fill="${rose}" opacity=".65"/>
  <path d="M137 133 Q163 150 192 145 L190 156 Q160 161 139 144Z" fill="${ochre}" stroke="${ink}" stroke-width="2.1"/>
  <path d="M161 155 L154 176 L165 179 L174 159Z" fill="${ochre}" stroke="${ink}" stroke-width="2.1"/>
  <ellipse cx="180" cy="108" rx="2.5" ry="3.2" fill="${ink}"/><ellipse cx="207" cy="108" rx="1.8" ry="2.8" fill="${ink}"/>
  <path d="M174 98 Q181 96 184 98" fill="none" stroke="${ink}" stroke-width="1.7"/>
  <ellipse cx="174" cy="119" rx="8" ry="4" fill="${rose}" opacity=".4"/>
  <path d="M210 119 L216 119 L213 123Z" fill="${rose}"/>
  <path d="M212 124 Q206 129 201 125" fill="none" stroke="${ink}" stroke-width="1.8"/>
  <path d="M191 122 L182 120 M193 128 L184 130" fill="none" stroke="${ink}" stroke-width="1.6"/>
  <path d="M145 163 L148 168 L154 169 L150 173 L150 179 L145 176 L140 179 L141 173 L137 169 L143 168Z" fill="${ochre}" stroke="${ink}" stroke-width="1.6"/>
  </g></g>`;
}
const sheet=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 512" width="1024" height="512">${Array.from({length:8},(_,i)=>walker(i)).join('')}</svg>`;
(async()=>{
  fs.writeFileSync(path.join(dir,'mooncat-art.svg'), hero, 'utf8');
  fs.writeFileSync(path.join(dir,'cat-walk.svg'), sheet, 'utf8');
  await sharp(Buffer.from(hero),{density:96}).resize(768,768).png().toFile(path.join(dir,'mooncat-art.png'));
  await sharp(Buffer.from(sheet),{density:96}).resize(1024,512).png().toFile(path.join(dir,'cat-walk.png'));
  console.log(JSON.stringify({hero:await sharp(path.join(dir,'mooncat-art.png')).metadata(),walk:await sharp(path.join(dir,'cat-walk.png')).metadata()},null,2));
})();
