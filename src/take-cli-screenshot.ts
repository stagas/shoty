import { renderScreenshot } from '@stagas/terminal-screenshot'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

export type CliScreenshotOptions = {
  outfile?: string
  root: string
  command?: string[]
  pixelRatio: number
  fontFamily: string
  fontSize: number
  lineHeight: number
}

export const takeCliScreenshot = async (options: CliScreenshotOptions) => {
  let stdoutData

  try {
    stdoutData = execSync(options.command!.join(' '), { cwd: options.root })
  } catch (error) {
    stdoutData = (error as any).stderr as Buffer
  }

  let outfile = options.outfile
  if (!outfile)
    outfile = path.resolve(path.join(options.root!, 'cli.png'))

  const image = await renderScreenshot({
    data: stdoutData.toString('utf8'), // Data to be render to the terminal.
    margin: 12, // Margin to leave around the terminal area in pixels. (default: 0)
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    lineHeight: options.lineHeight,
    backgroundColor: 'black', // Background color of the terminal. (default: black)
    pixelRatio: options.pixelRatio,
    type: 'png', // Type of the screenshot to be generated. (default: png)
  })

  fs.writeFileSync(outfile, image)
}
