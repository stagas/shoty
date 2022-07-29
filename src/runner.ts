import { arg, decarg } from 'decarg'
import * as fs from 'fs'
import * as path from 'path'
import { takeAnimation } from './take-animation'
import { takeCliScreenshot } from './take-cli-screenshot'
import { takeScreenshot } from './take-screenshot'

export class Options {
  @arg('[file]', 'File to screenshot (.js, .jsx, .ts, .tsx)') file?: string = ''

  @arg('--', '[command with args]', 'Command to execute and screenshot its output') command?: string[] = []

  @arg('-o', '--outfile', 'Output filename (defaults to same as file with .png or .webp)') outfile?: string = ''

  @arg('-s', '--selector', 'Element selector') selector = '#demo'

  @arg('-d', '--delay', 'Delay in seconds after which to take screenshot') delay = 0

  @arg('-l', '--length', 'Length in seconds for video screenshots') length = 1

  @arg('-w', '--width', 'Viewport width') width = 800

  @arg('-h', '--height', 'Viewport height') height = 600

  @arg('-p', '--pixel-ratio', 'Device pixel ratio') pixelRatio = 2

  @arg('--font-family', 'Font family') fontFamily = 'Ubuntu Mono'

  @arg('--font-size', 'Font size') fontSize = 14

  @arg('--line-height', 'Line height') lineHeight = 1.1

  @arg('--root', 'Root directory to serve files from') root = '.'

  @arg('--https', 'Use https') https = false

  constructor(options: Partial<Options> = {}) {
    Object.assign(this, options)
  }
}

export const run = async (options: Options) => {
  if (options.file) {
    const filePath = path.resolve(path.join(options.root, options.file))
    const contents = fs.readFileSync(filePath, 'utf8')
    if (contents.includes('requestAnimationFrame'))
      await takeAnimation(options)
    else
      await takeScreenshot(options)
  } else if (options.command)
    await takeCliScreenshot(options)
  else
    decarg(options, ['--help'])
}
