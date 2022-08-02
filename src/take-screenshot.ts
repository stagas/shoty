import * as path from 'path'
import puppeteer from 'puppeteer'
import pretty from 'puppeteer-pretty-console'
import { mergeConfig } from 'vite'
import { open, Options as ViteOpenOptions } from 'vite-open'

export type ScreenshotOptions = Partial<ViteOpenOptions> & {
  delay: number
  height: number
  outfile?: string
  pixelRatio: number
  selector: string
  width: number
}

export const takeScreenshot = async (
  options: ScreenshotOptions,
): Promise<any> => {
  let errorHook!: (error: Error) => void
  const errorPromise = new Promise<void>((_, reject) => (errorHook = reject))

  let outfile = options.outfile
  if (!outfile) {
    outfile = path.resolve(path.join(options.root!, options.file!))
    outfile = path.join(path.dirname(outfile), path.basename(outfile, path.extname(outfile)) + '.png')
  }

  options.viteOptions = mergeConfig(options.viteOptions ?? {}, {
    server: {
      hmr: false,
      watch: {
        ignored: ['*'],
      },
    },
  } as Partial<ViteOpenOptions['viteOptions']>)

  const server = await open(options)
  server.vite.httpServer!.on('error', errorHook)
  server.vite.httpServer!.on('clientError', errorHook)

  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    defaultViewport: {
      width: options.width,
      height: options.height,
      deviceScaleFactor: options.pixelRatio,
    },
  }
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
  const browser = await puppeteer.launch(launchOptions)

  const close = async () => {
    // wait for console to flush
    await new Promise(resolve => setTimeout(resolve, 20))

    await browser.close()
    try {
      await server.vite.close()
    } catch {}

    // wait for vite to close
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  const result = await Promise.race([
    errorPromise,
    (async () => {
      const page = await browser.newPage()
      pretty(page as any)
      page.on('error', errorHook)
      page.on('pageerror', errorHook)
      page.on('requestfailed', (req: puppeteer.HTTPRequest) => {
        const error = new Error(req.failure()?.errorText)
        errorHook(error)
      })

      const maxAttempts = 3
      let attempts = 0
      do {
        try {
          await page.emulateMediaFeatures([{
            name: 'prefers-color-scheme',
            value: 'dark',
          }])
          await page.goto(server.networkAddr, { waitUntil: 'networkidle2', timeout: 5000 })
          await page.waitForSelector(options.selector)
          const element = await page.$(options.selector)
          await new Promise(resolve => setTimeout(resolve, options.delay * 1000))
          await element!.screenshot({ path: outfile, omitBackground: true })
          await close()
          console.log('Screenshot saved:', outfile)
          return
        } catch (error) {
          console.error(error)
        }
      } while (attempts++ < maxAttempts)

      throw new Error('Too many attempts')
    })(),
  ]).catch(async error => {
    await close()
    throw error
  })

  return result
}

export default takeScreenshot
