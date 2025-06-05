import { Request, Response } from "express";
import puppeteer from "puppeteer-extra";
import { firefox } from "playwright";
import { app_config } from "../../../configs/app.config";
import { ShopeeScrapp, HTTPHeaders, ShopeeProductData } from "../../interfaces/shopee.interface";
import { getRandomUserAgent } from "../../utils/user_agent.util";

import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

declare global {
  interface Window {
    chrome: {
      runtime: {};
    };
  }
}

export async function scrapping(req: Request<{}, {}, ShopeeScrapp>, res: Response) {
    const { storeId, dealId, item } = req.body;

    const baseUrl: string = `${app_config.shopee_base_api}/${item}`;
    const url: string = `${baseUrl}--i.${storeId}.${dealId}`;
    const apiUrl: string = `${app_config.shopee_base_api}/api/v4/pdp/get_pc?item_id=${dealId}&shopid=${storeId}&tz_offset_minutes=420&detail_level=0`;
    
    // const userAgent = getRandomUserAgent();
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0";

    const sleepWait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        let capturedHeaders: Record<string, string> = {};

        const browser = await puppeteer.launch({ 
            headless: true,
            // executablePath: '/usr/bin/chromium',
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                // '--headless=new',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-software-rasterizer',
                '--disable-blink-features=AutomationControlled',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                // '--single-process',
                '--disable-background-networking',
            ],
            protocolTimeout: 120000
        });

        const page = await browser.newPage();

        await page.setUserAgent(userAgent);
        await page.setViewport({ 
            width: 1920 + Math.floor(Math.random() * 100),
            height: 1080 + Math.floor(Math.random() * 100) 
        });

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });

            // Fake plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3],
            });

            // Fake languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Fake chrome runtime (used by detection scripts)
            window.chrome = {
                runtime: {},
            };
        });

        await page.setRequestInterception(true);
        
        page.on('request', (req) => {
            const url = req.url();
            const headers = req.headers();

            if (url.includes('/api/v4/pdp/get_pc')) {
                capturedHeaders = {
                    ...headers,
                    'x-api-source': 'pc',
                    'Cache-Control': "no-cache",
                    'Pragma': "no-cache",
                    'TE': "trailer"
                };
            }

            req.continue();
        });

        let data = {};
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/v4/pdp/get_pc')) {
                data = await response.json();
                console.log('Product JSON:', data);
            }
        });


        // await page.setExtraHTTPHeaders(capturedHeaders);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

        await page.waitForSelector('body');

        await sleepWait(5000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));


        const actualUserAgent = await page.evaluate(() => navigator.userAgent);
        console.log('🧭 Verified User-Agent:', actualUserAgent);

        console.log('header', capturedHeaders);
        // const data = await page.evaluate((apiUrl, capturedHeaders) => {
        //     return window.fetch(apiUrl, {
        //         method: 'GET',
        //         credentials: 'include',
        //         headers: capturedHeaders
        //     }).then(res => res.json());
        // }, apiUrl, capturedHeaders);

        await sleepWait(5000);

        await browser.close();

        res.status(200).json({
            status: 'OK',
            data,
            message: 'Scraped successfully',
        });
    } catch (error: any) {
        console.error('Shopee scraping error:', error);
        res.status(500).json({
            status: 'ERROR',
            data: null,
            message: {
                url,
                apiUrl,
                error: error.message,
                stack: error.stack,
            },
        });
    }
}

export async function scrappingMozilla(req: Request<{}, {}, ShopeeScrapp>, res: Response) {
    const { storeId, dealId, item } = req.body;

    const baseUrl: string = `${app_config.shopee_base_api}/${item}`;
    const url: string = `${baseUrl}--i.${storeId}.${dealId}`;
    const apiUrl: string = `${app_config.shopee_base_api}/api/v4/pdp/get_pc?item_id=${dealId}&shopid=${storeId}&tz_offset_minutes=420&detail_level=0`;
    
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0";

    const sleepWait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        let capturedHeaders: Record<string, string> = {};
        let cookieString = '';
        let productData: any = null;

        const browser = await firefox.launch({ 
            headless: false,
        });
        const context = await browser.newContext({
        userAgent,
        viewport: {
            width: 1920 + Math.floor(Math.random() * 100),
            height: 1080 + Math.floor(Math.random() * 100),
        }
        });

        const page = await context.newPage();
        // Intercept Shopee internal API response
        page.on('response', async (response) => {
        const reqUrl = response.url();
        if (reqUrl.includes('/api/v4/pdp/get_pc')) {
            try {
                productData = await response.json();
            } catch (err) {
            console.error('❌ Failed to parse JSON:', err);
            }
        }
        });

        // Intercept headers
        await page.route('**/*', async (route, request) => {
            const url = request.url();
            if (url.includes('/api/v4/pdp/get_pc')) {
                const headers = request.headers();
                capturedHeaders = { ...headers };
                if (!capturedHeaders['cookie']) {
                    capturedHeaders['cookie'] = cookieString;
                }
            }
            await route.continue();
        });

        await page.goto(url, { waitUntil: 'networkidle' });
        await page.waitForSelector('body');

        // Scroll to trigger lazy-loaded network calls
        await sleepWait(5000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // Get cookies
        const cookies = await context.cookies();
        cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        const actualUA = await page.evaluate(() => navigator.userAgent);
        console.log('🧭 Verified User-Agent:', actualUA);

        // Wait for the specific API response
        // await page.waitForResponse(resp =>
        //     resp.url().includes('/api/v4/pdp/get_pc'), { timeout: 60000 });

        const data = await page.evaluate(({ apiUrl, headers }) => {
            return window.fetch(apiUrl, {
                method: 'GET',
                credentials: 'include',
                headers: headers
            }).then(res => res.json());
        }, { apiUrl, headers: capturedHeaders });

        await sleepWait(3000);
        // await browser.close();

        if (!productData) throw new Error('Failed to capture Shopee product data');

        res.status(200).json({
            status: 'OK',
            data,
            message: 'Scraped successfully',
        });
    } catch (error: any) {
        console.error('Shopee scraping error:', error);
        res.status(500).json({
            status: 'ERROR',
            data: null,
            message: {
                url,
                apiUrl,
                error: error.message,
                stack: error.stack,
            },
        });
    }
}

export async function getScrapping(req: Request<{}, {}, ShopeeScrapp>, res: Response) {
    const { storeId, dealId, item } = req.query;

    const baseUrl: string = `${app_config.shopee_base_api}/${item}`;
    const url: string = `${baseUrl}-i.${storeId}.${dealId}`;
    const apiUrl: string = `${app_config.shopee_base_api}/api/v4/pdp/get_pc?itemid=${dealId}&shopid=${storeId}&tz_offset_minutes=420&detail_level=0`;
    
    // const userAgent = getRandomUserAgent();
    const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0";

    const sleepWait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        let capturedHeaders: Record<string, string> = {};

        const browser = await puppeteer.launch({ 
            headless: true,
            // executablePath: '/usr/bin/chromium',
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                // '--headless=new',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-software-rasterizer',
                '--disable-blink-features=AutomationControlled',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                // '--single-process',
                '--disable-background-networking',
            ],
            protocolTimeout: 120000
        });

        const page = await browser.newPage();

        await page.setUserAgent(userAgent);
        await page.setViewport({ 
            width: 1920 + Math.floor(Math.random() * 100),
            height: 1080 + Math.floor(Math.random() * 100) 
        });

        await page.evaluateOnNewDocument(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => false });

            // Fake plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3],
            });

            // Fake languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });

            // Fake chrome runtime (used by detection scripts)
            window.chrome = {
                runtime: {},
            };
        });

        await page.setRequestInterception(true);
        
        page.on('request', (req) => {
            const url = req.url();
            const headers = req.headers();

            if (url.includes('/api/v4/pdp/get_pc')) {
                capturedHeaders = {
                    ...headers,
                    'x-api-source': 'pc',
                    'Cache-Control': "no-cache",
                    'Pragma': "no-cache",
                    'TE': "trailer"
                };
            }

            req.continue();
        });

        let data = {};
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('/api/v4/pdp/get_pc')) {
                data = await response.json();
                console.log('Product JSON:', data);
            }
        });


        // await page.setExtraHTTPHeaders(capturedHeaders);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

        await page.waitForSelector('body');

        await sleepWait(5000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));


        const actualUserAgent = await page.evaluate(() => navigator.userAgent);
        console.log('🧭 Verified User-Agent:', actualUserAgent);

        console.log('header', capturedHeaders);
        // const data = await page.evaluate((apiUrl, capturedHeaders) => {
        //     return window.fetch(apiUrl, {
        //         method: 'GET',
        //         credentials: 'include',
        //         headers: capturedHeaders
        //     }).then(res => res.json());
        // }, apiUrl, capturedHeaders);

        await sleepWait(5000);

        await browser.close();

        res.status(200).json({
            status: 'OK',
            data,
            message: 'Scraped successfully',
        });
    } catch (error: any) {
        console.error('Shopee scraping error:', error);
        res.status(500).json({
            status: 'ERROR',
            data: null,
            message: {
                url,
                apiUrl,
                error: error.message,
                stack: error.stack,
            },
        });
    }
}