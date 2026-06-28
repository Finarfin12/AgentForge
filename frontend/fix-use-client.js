const fs = require('fs');
const path = require('path');

function f(d) {
  for (const x of fs.readdirSync(d)) {
    const l = path.join(d, x);
    if (fs.statSync(l).isDirectory()) f(l);
    else if (x.endsWith('.tsx')) {
      let c = fs.readFileSync(l, 'utf8');
      if (c.includes('use client') && !c.startsWith("'use client'") && !c.startsWith('"use client"')) {
        c = c.replace(/'use client';?\n?|"use client";?\n?/g, '');
        c = "'use client';\n" + c;
        fs.writeFileSync(l, c);
        console.log('fixed', l);
      }
    }
  }
}
f('c:\\Project_Orchestrator\\frontend\\src\\app');
