// The functions' architecture check (design/README.md, rule 7): it reads their sources. The logic in
// `_shared/logic/` imports only the ports and pure local modules, and reaches nothing outside; each function's
// `index.ts` makes the adapters and the logic, calls its inbound port and puts the answer on the wire, and
// does nothing else.

import { assert, assertEquals } from 'jsr:@std/assert@1';

const FUNCTIONS = new URL('../', import.meta.url);
const LOGIC = new URL('./logic/', import.meta.url);
const HANDLERS = ['add-server', 'add-bot', 'add-relay'];

const STRINGS_AND_COMMENTS = /("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g;

/** The source without its comments. */
const withoutComments = (src: string) => src.replace(STRINGS_AND_COMMENTS, (m, str) => str ?? '');
/** The source without its comments and the text of its strings: what is left is code. */
const code = (src: string) =>
  src.replace(STRINGS_AND_COMMENTS, (m, str) => str ? str[0] + str[0] : '');

const IMPORT =
  /\b(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]/g;

const importsOf = (src: string): string[] =>
  [...withoutComments(src).matchAll(IMPORT)].map((m) => m[1] ?? m[2] ?? m[3]);

const read = (url: URL) => Deno.readTextFileSync(url);

const logicFiles = (): string[] =>
  [...Deno.readDirSync(LOGIC)].filter((e) => e.isFile && e.name.endsWith('.ts') && !e.name.endsWith('.test.ts'))
    .map((e) => e.name).sort();

/** What makes a module impure: reaching the network, the runtime or the machine. */
const IMPURE: [RegExp, string][] = [
  [/\bDeno\./, 'uses `Deno.`'],
  [/\bfetch\b/, 'uses `fetch`'],
  [/\bglobalThis\b/, 'uses `globalThis`'],
  [/\bXMLHttpRequest\b|\bWebSocket\b/, 'uses the network'],
];

const problemsOfLogic = (name: string, src: string): string[] => {
  const problems: string[] = [];
  for (const spec of importsOf(src)) {
    if (spec.startsWith('../ports/')) continue;
    if (/^\.\/[\w-]+\.ts$/.test(spec) && !spec.endsWith('.test.ts')) {
      // a pure local module: held to the same rules
      const local = spec.slice(2);
      try {
        problems.push(...problemsOfLogic(`${name} -> ${local}`, read(new URL(local, LOGIC))));
      } catch {
        problems.push(`${name}: imports ${spec}, which cannot be read`);
      }
      continue;
    }
    problems.push(`${name}: imports '${spec}', which is not ../ports/ or a pure local module`);
  }
  const body = code(src);
  for (const [re, why] of IMPURE) if (re.test(body)) problems.push(`${name}: ${why}`);
  return problems;
};

Deno.test('architecture: _shared/logic/ has a file for each function', () => {
  assertEquals(logicFiles().filter((f) => HANDLERS.map((h) => `${h}.ts`).includes(f)), HANDLERS.map((h) => `${h}.ts`).sort());
});

Deno.test('architecture: the logic imports only the ports and pure local modules, and reaches nothing outside', () => {
  const problems = logicFiles().flatMap((f) => problemsOfLogic(f, read(new URL(f, LOGIC))));
  assertEquals(problems, []);
});

/** What a handler may import: the ports, the logic, the adapters, and the runtime's and the client's libraries. */
const HANDLER_IMPORT = /^(\.\.\/_shared\/(ports|logic|adapters)\/|jsr:|npm:|https:\/\/esm\.sh\/)/;

/** What a handler must not do: that is the logic's or an adapter's. */
const NOT_A_HANDLER: [RegExp, string][] = [
  [/\bnew URL\b|\bURLSearchParams\b|\bJSON\.parse\b|\batob\b|\bbtoa\b/, 'parses or decodes'],
  [/\.(?:from|select|insert|upsert|update|delete|eq|maybeSingle|single)\s*\(/, 'queries the database'],
  [/\.(?:match|test|replace|split)\s*\(|\bRegExp\b|(?<![\w)\]/])\/(?![/*])[^/\n]+\/[gimsuy]*\s*[.;,)]/, 'matches text'],
  [/\bswitch\b|\benum\b/, 'decides'],
];
const MAX_CODE_LINES = 60;

const problemsOfHandler = (name: string, src: string): string[] => {
  const problems: string[] = [];
  const specs = importsOf(src);
  for (const spec of specs) {
    if (!HANDLER_IMPORT.test(spec)) problems.push(`${name}: imports '${spec}', which is not a port, the logic, an adapter or a library`);
  }
  if (!specs.includes(`../_shared/logic/${name}.ts`)) problems.push(`${name}: does not make the logic of ../_shared/logic/${name}.ts`);
  if (!specs.some((s) => s.startsWith('../_shared/adapters/') || s.includes('supabase-js'))) {
    problems.push(`${name}: does not make an adapter`);
  }
  const body = code(src);
  if (!/\.add\s*\(/.test(body)) problems.push(`${name}: does not call its inbound port`);
  for (const [re, why] of NOT_A_HANDLER) if (re.test(body)) problems.push(`${name}: ${why}, which is not the handler's`);
  const lines = body.split('\n').filter((l) => l.trim() !== '').length;
  if (lines > MAX_CODE_LINES) problems.push(`${name}: ${lines} lines of code, more than the ${MAX_CODE_LINES} a handler needs`);
  return problems;
};

for (const name of HANDLERS) {
  Deno.test(`architecture: ${name}/index.ts only makes the adapters and the logic, calls its port and puts the answer on the wire`, () => {
    const src = read(new URL(`${name}/index.ts`, FUNCTIONS));
    assertEquals(problemsOfHandler(name, src), []);
  });
}

// The check itself: it must see what it forbids.
Deno.test('architecture: the check sees a logic file that reaches outside', () => {
  const bad = `import { createClient } from 'npm:@supabase/supabase-js';\nimport x from '../adapters/a.ts';\nexport const f = () => fetch('x') && Deno.env.get('A');`;
  assert(problemsOfLogic('bad.ts', bad).length >= 4);
  assertEquals(problemsOfLogic('ok.ts', `import type { Answer } from '../ports/types.ts';\n// fetch Deno.env\nconst s = 'fetch';`), []);
});
