require('dts-generator').generate({
  name: 'phosphor-signaling',
  main: 'phosphor-signaling/index',
  baseDir: 'lib',
  files: ['index.d.ts'],
  out: 'lib/phosphor-signaling.d.ts',
  externs: ['../src/_references.d.ts'],
  target: 1 // ts.ScriptTarget.ES5
});
