import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = path => readFileSync(path, 'utf8');
const fail = message => { console.error('FAIL:', message); process.exitCode = 1; };
const requireOk = (condition, message) => { if (!condition) fail(message); };
const unique = values => values.length === new Set(values).size;

function syntaxCheck(source, moduleMode, label) {
  const args = moduleMode ? ['--input-type=module', '--check'] : ['--check'];
  const result = spawnSync(process.execPath, args, { input: source, encoding: 'utf8' });
  if (result.status !== 0) fail(label + ' syntax error:\n' + (result.stderr || result.stdout));
}

const toolsSource = read('js/tools/tools-page.js');
const gamesSource = read('js/games/games-page.js');
const functionsSource = read('functions/index.js');
const packageJson = JSON.parse(read('functions/package.json'));

syntaxCheck(toolsSource, true, 'js/tools/tools-page.js');
syntaxCheck(gamesSource, true, 'js/games/games-page.js');
syntaxCheck(functionsSource, false, 'functions/index.js');

const toolsStart = toolsSource.indexOf('const tools=[');
const toolsEnd = toolsSource.indexOf('];', toolsStart);
const toolsBlock = toolsSource.slice(toolsStart, toolsEnd + 2);
const toolIds = [...toolsBlock.matchAll(/^\s*\['([^']+)'/gm)].map(match => match[1]);
const rendererStart = toolsSource.indexOf('const renderers={');
const rendererEnd = toolsSource.indexOf('};', rendererStart);
const rendererBlock = toolsSource.slice(rendererStart, rendererEnd + 2);

requireOk(toolIds.length > 0, 'No JMB Area tool cards found.');
requireOk(unique(toolIds), 'Duplicate tool IDs found.');
for (const id of toolIds) requireOk(rendererBlock.includes(id), 'Tool has no renderer: ' + id);
const duplicateFunctions = [...toolsSource.matchAll(/(?:async\s+)?function\s+([\w$]+)\s*\(/g)]
  .map(match => match[1]).filter((name, index, all) => all.indexOf(name) !== index);
requireOk(duplicateFunctions.length === 0, 'Duplicate tool function declarations: ' + duplicateFunctions.join(', '));
requireOk(toolsSource.includes('function evaluateMath('), 'Safe calculator parser missing.');
requireOk(toolsSource.includes('JMBENC1:'), 'Text encryption tool missing.');
requireOk(toolsSource.includes('function fileencrypt('), 'File encryption tool missing.');
requireOk(toolsSource.includes('function filehash('), 'File checksum tool missing.');

const gamesStart = gamesSource.indexOf('const games=[');
const gamesEnd = gamesSource.indexOf('];', gamesStart);
const gamesBlock = gamesSource.slice(gamesStart, gamesEnd + 2);
const gameIds = [...gamesBlock.matchAll(/^\s*\['([^']+)'/gm)].map(match => match[1]);
const gameRendererStart = gamesSource.indexOf('const render={');
const gameRendererEnd = gamesSource.indexOf('};', gameRendererStart);
const gameRenderer = gamesSource.slice(gameRendererStart, gameRendererEnd + 2);
requireOk(gameIds.length > 0, 'No game cards found.');
requireOk(unique(gameIds), 'Duplicate game IDs found.');
for (const id of gameIds) requireOk(gameRenderer.includes(id), 'Game has no renderer: ' + id);
requireOk(gamesSource.includes('function mathdash('), 'Math Dash implementation missing.');

const allowlistStart = functionsSource.indexOf('const SKILL_GAMES');
const allowlistEnd = functionsSource.indexOf(']);', allowlistStart);
const allowlist = new Set([...functionsSource.slice(allowlistStart, allowlistEnd).matchAll(/'([^']+)'/g)].map(match => match[1]));
const rewardAliases = { mathdash: 'math', wordle: 'word', pattern: 'memory' };
for (const id of gameIds) {
  const rewardId = rewardAliases[id] || id;
  requireOk(allowlist.has(rewardId), 'Game reward ID is not allowed by Cloud Functions: ' + id + ' -> ' + rewardId);
}

requireOk(Number(packageJson.engines?.node) >= 22, 'Cloud Functions should use Node.js 22 or newer.');
if (process.exitCode) process.exit(process.exitCode);
console.log('JMBHUB static validation passed: ' + toolIds.length + ' tools, ' + gameIds.length + ' games, module syntax, reward mappings, and Node.js runtime.');
