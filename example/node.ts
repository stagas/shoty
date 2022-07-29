import { Options, run } from '../src'

run(
  new Options({
    file: 'web.ts',
    root: __dirname,
  })
).then(() => console.log('complete'))
