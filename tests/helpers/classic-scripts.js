import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const root = path.resolve(import.meta.dirname, '../..');

export function createClassicContext({ html = '<!doctype html><body></body>', setup } = {}) {
  const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only' });
  const context = dom.getInternalVMContext();
  context.alert = () => {};
  context.confirm = () => true;
  context.console = console;
  setup?.(context, dom.window);
  return { context, window: dom.window };
}

export function loadClassic(context, ...files) {
  for (const file of files) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
}

export function evaluate(context, source) {
  return vm.runInContext(source, context);
}
