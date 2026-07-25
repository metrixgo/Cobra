/* Cobra: Blockly workspace + custom block definitions + Python generators. */
const python = Blockly.Python;
const codeEl = document.getElementById('pythonCode');
const outputEl = document.getElementById('programOutput');

Blockly.defineBlocksWithJsonArray([
  { type: 'cobra_print', message0: 'print %1', args0: [{ type: 'input_value', name: 'VALUE' }], previousStatement: null, nextStatement: null, colour: 160, tooltip: 'Display a value' },
  { type: 'cobra_range_loop', message0: 'count %1 from %2 to %3', args0: [{ type: 'field_input', name: 'VAR', text: 'i' }, { type: 'input_value', name: 'FROM', check: 'Number' }, { type: 'input_value', name: 'TO', check: 'Number' }], message1: 'do %1', args1: [{ type: 'input_statement', name: 'DO' }], previousStatement: null, nextStatement: null, colour: 230, tooltip: 'Repeat blocks for every number in the range' },
  { type: 'cobra_assign', message0: 'set %1 to %2', args0: [{ type: 'field_input', name: 'NAME', text: 'score' }, { type: 'input_value', name: 'VALUE' }], previousStatement: null, nextStatement: null, colour: 330, tooltip: 'Create or update a Python variable' },
  { type: 'cobra_input', message0: 'ask %1', args0: [{ type: 'field_input', name: 'PROMPT', text: 'What is your name?' }], output: 'String', colour: 65, tooltip: 'Ask the user for text' },
  { type: 'cobra_comment', message0: 'comment %1', args0: [{ type: 'field_input', name: 'TEXT', text: 'Describe this step' }], previousStatement: null, nextStatement: null, colour: 20, tooltip: 'Add a Python comment' }
]);

const safeName = (name) => {
  const cleaned = String(name || 'value').trim().replace(/\W/g, '_').replace(/^\d/, '_');
  return cleaned || 'value';
};
const value = (block, name, fallback) => python.valueToCode(block, name, python.ORDER_NONE) || fallback;
python.forBlock.cobra_print = (block) => `print(${value(block, 'VALUE', "''")})\n`;
python.forBlock.cobra_range_loop = (block) => {
  const from = value(block, 'FROM', '0');
  const to = value(block, 'TO', '10');
  const body = python.statementToCode(block, 'DO') || '  pass\n';
  return `for ${safeName(block.getFieldValue('VAR'))} in range(${from}, (${to}) + 1):\n${body}`;
};
python.forBlock.cobra_assign = (block) => `${safeName(block.getFieldValue('NAME'))} = ${value(block, 'VALUE', '0')}\n`;
python.forBlock.cobra_input = (block) => [`input(${JSON.stringify(block.getFieldValue('PROMPT') || '')})`, python.ORDER_FUNCTION_CALL];
python.forBlock.cobra_comment = (block) => `# ${block.getFieldValue('TEXT') || ''}\n`;

const toolbox = {
  kind: 'categoryToolbox', contents: [
    { kind: 'CATEGORY', name: 'Start here', colour: '#4b8fe2', contents: [
      { kind: 'BLOCK', type: 'cobra_print', inputs: { VALUE: { shadow: { type: 'text', fields: { TEXT: 'Hello, Cobra!' } } } } },
      { kind: 'BLOCK', type: 'cobra_range_loop', inputs: { FROM: { shadow: { type: 'math_number', fields: { NUM: 1 } } }, TO: { shadow: { type: 'math_number', fields: { NUM: 10 } } } } },
      { kind: 'BLOCK', type: 'cobra_assign', inputs: { VALUE: { shadow: { type: 'math_number', fields: { NUM: 0 } } } } }
    ] },
    { kind: 'CATEGORY', name: 'Actions', colour: '#14a67a', contents: [
      { kind: 'BLOCK', type: 'cobra_print' }, { kind: 'BLOCK', type: 'cobra_comment' }, { kind: 'BLOCK', type: 'controls_if' }, { kind: 'BLOCK', type: 'controls_repeat_ext' }
    ] },
    { kind: 'CATEGORY', name: 'Loops', colour: '#5b65d6', contents: [
      { kind: 'BLOCK', type: 'cobra_range_loop' }, { kind: 'BLOCK', type: 'controls_whileUntil' }, { kind: 'BLOCK', type: 'controls_for' }
    ] },
    { kind: 'CATEGORY', name: 'Variables', colour: '#b85cc7', custom: 'VARIABLE' },
    { kind: 'CATEGORY', name: 'Values', colour: '#e39a2d', contents: [
      { kind: 'BLOCK', type: 'math_number' }, { kind: 'BLOCK', type: 'text' }, { kind: 'BLOCK', type: 'cobra_input' }, { kind: 'BLOCK', type: 'math_arithmetic' }, { kind: 'BLOCK', type: 'logic_compare' }, { kind: 'BLOCK', type: 'logic_boolean' }
    ] }
  ]
};

const workspace = Blockly.inject('blocklyDiv', { toolbox, renderer: 'zelos', trashcan: true, scrollbars: true, grid: { spacing: 20, length: 3, colour: '#d9dee5', snap: false }, zoom: { controls: true, wheel: true, startScale: 1, maxScale: 1.6, minScale: .65, scaleSpeed: 1.15 }, move: { scrollbars: true, drag: true, wheel: true } });

function generateCode() {
  const generated = python.workspaceToCode(workspace).trimEnd();
  codeEl.textContent = generated || '# Drag blocks here to generate Python.';
  localStorage.setItem('cobra-workspace', JSON.stringify(Blockly.serialization.workspaces.save(workspace)));
  return generated;
}
function restoreWorkspace() {
  try {
    const saved = localStorage.getItem('cobra-workspace');
    if (saved) Blockly.serialization.workspaces.load(JSON.parse(saved), workspace);
  } catch (_) { localStorage.removeItem('cobra-workspace'); }
}
workspace.addChangeListener((event) => { if (!event.isUiEvent) generateCode(); });
restoreWorkspace();
generateCode();
window.addEventListener('resize', () => Blockly.svgResize(workspace));

document.getElementById('exportButton').addEventListener('click', () => {
  const blob = new Blob([generateCode() || '# Cobra program\n'], { type: 'text/x-python' });
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'cobra_program.py' });
  link.click(); URL.revokeObjectURL(link.href);
});
document.getElementById('clearButton').addEventListener('click', () => { workspace.clear(); outputEl.textContent = 'Workspace cleared.'; });
document.getElementById('clearOutput').addEventListener('click', () => { outputEl.textContent = ''; });

let pyodidePromise;
async function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js';
      script.onload = () => loadPyodide({ stdout: (text) => { outputEl.textContent += `${text}\n`; }, stderr: (text) => { outputEl.textContent += `Error: ${text}\n`; } }).then(resolve, reject);
      script.onerror = () => reject(new Error('Python runner could not be downloaded. Check your internet connection.'));
      document.head.append(script);
    });
  }
  return pyodidePromise;
}
document.getElementById('runButton').addEventListener('click', async () => {
  const code = generateCode();
  if (!code) { outputEl.textContent = 'Add a block before running.'; return; }
  outputEl.textContent = 'Starting Python...\n';
  const button = document.getElementById('runButton'); button.disabled = true;
  try { const runtime = await getPyodide(); outputEl.textContent = ''; await runtime.runPythonAsync(code); if (!outputEl.textContent) outputEl.textContent = 'Finished with no output.'; }
  catch (error) { outputEl.textContent += `\n${error.message}`; }
  finally { button.disabled = false; }
});
