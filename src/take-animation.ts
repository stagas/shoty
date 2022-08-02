import timecut from '@stagas/timecut'
import * as path from 'path'
import puppeteer from 'puppeteer'
import { mergeConfig } from 'vite'
import { open, Options as ViteOpenOptions } from 'vite-open'

export type AnimationOptions = Partial<ViteOpenOptions> & {
  delay: number
  height: number
  length: number
  outfile?: string
  pixelRatio: number
  selector: string
  width: number
}

export const takeAnimation = async (
  options: AnimationOptions,
): Promise<any> => {
  let errorHook!: (error: Error) => void
  const errorPromise = new Promise<void>((_, reject) => (errorHook = reject))

  let outfile = options.outfile
  if (!outfile) {
    outfile = path.resolve(path.join(options.root!, options.file!))
    outfile = path.join(path.dirname(outfile), path.basename(outfile, path.extname(outfile)) + '.webp')
  }

  options.viteOptions = mergeConfig(options.viteOptions ?? {}, {
    server: {
      force: false,
      hmr: false,
      watch: {
        ignored: ['*'],
      },
    },
  } as Partial<ViteOpenOptions['viteOptions']>)

  const server = await open(options)
  server.vite.httpServer!.on('error', errorHook)
  server.vite.httpServer!.on('clientError', errorHook)

  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {}
  launchOptions.args = [
    ...new Set([
      '--enable-features=WebUIDarkMode',
      '--force-dark-mode',
      '--allow-insecure-localhost',
      '--autoplay-policy=no-user-gesture-required',
      '--ignore-certificate-errors',
      '--mute-audio',
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ]),
  ]

  const close = async () => {
    // wait for console to flush
    await new Promise(resolve => setTimeout(resolve, 20))

    try {
      await server.vite.close()
    } catch {}

    // wait for vite to close
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const result = await Promise.race([
    errorPromise,
    (async () => {
      await timecut({
        url: server.networkAddr,
        output: outfile,
        selector: options.selector,
        launchArguments: launchOptions.args,
        outputOptions: ['-lossless', '1', '-preset', 'none', '-loop', '0'],
        pixFmt: 'bgra',
        viewport: {
          width: options.width,
          height: options.height,
          deviceScaleFactor: options.pixelRatio,
        },
        transparentBackground: true,
        preparePage: ((page: any) => page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }])),
        startDelay: 1,
        start: options.delay,
        duration: options.length,
      })

      await close()
      console.log('Animation saved:', outfile)
      return
    })(),
  ]).catch(async error => {
    await close()
    throw error
  })

  return result
}

export default takeAnimation
