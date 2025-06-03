import { Request, Response } from "express";
import puppeteer from "puppeteer-extra";
import axios from "axios";
import { app_config } from "../../../configs/app.config";
import { ShopeeScrapp } from "../../interfaces/shopee.interface";

import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

export async function scrapping(req: Request<{}, {}, ShopeeScrapp>, res: Response) {
    const { storeId, dealId, item } = req.body;

    const baseUrl: string = `${app_config.shopee_base_api}/${item}`;
    const url: string = `${baseUrl}--i.${storeId}.${dealId}`;
    const apiUrl: string = `${app_config.shopee_base_api}/api/v4/pdp/get_pc?item_id=${dealId}&shop_id=${storeId}&tz_offset_minutes=420&detail_level=0`;
    const apiUrlID: string = `${app_config.shopee_base_api}/api/v4/pdp/get_pc?itemid=${dealId}&shopid=${storeId}&tz_offset_minutes=420&detail_level=0`;
    const referer: string = `https://shopee.co.id/xiaomi.official.id`;

    const sleepWait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
        let capturedHeaders: Record<string, string> = {};

        const browser = await puppeteer.launch({ 
            headless: true,
            executablePath: '/usr/bin/chromium', 
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--headless=new',
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-software-rasterizer',
                '--disable-blink-features=AutomationControlled',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                // '--no-zygote',
                // '--single-process',
                // '--disable-background-networking',
            ],
            protocolTimeout: 120000
        });

        const page = await browser.newPage();

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0'
        );

        await page.setExtraHTTPHeaders({
            'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        });

        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const headers = req.headers();
            const url = req.url();

            if (url.includes('/api/v4/pdp/get_pc')) {
                for (const key in headers) {
                    if (typeof headers[key] === 'string') {
                        capturedHeaders[key] = headers[key];
                    }
                }

                // Append cookies if not already present
                if (!capturedHeaders['cookie']) {
                    capturedHeaders['cookie'] = cookieString;
                }
            }
            req.continue();
        });

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 120000 });

        await page.waitForSelector('body');

        await sleepWait(5000);
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

        // const cookies = await page.cookies();
        const client = await page.createCDPSession();
        const { cookies } = await client.send('Network.getAllCookies');
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');
console.log('mula', capturedHeaders);
        // const data = await page.evaluate((apiUrl, cookieStr, referer) => {
        //     return window.fetch(apiUrl, {
        //         method: 'GET',
        //         credentials: 'include',
        //         headers: {
        //             'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:139.0) Gecko/20100101 Firefox/139.0',
        //             'Accept-Language': 'en-GB,en;q=0.5',
        //             'Cookie': cookieStr,
        //             'referer': referer,
        //             'x-api-source': 'pc',
        //             'x-shopee-language': 'id',
        //             'accept': 'application/json',
        //             'content-type': 'application/json'
        //         }
        //     }).then(res => res.json());
        // }, apiUrl, cookieString, referer);

        const data = await page.evaluate((apiUrl, capturedHeaders) => {
            return window.fetch(apiUrl, {
                method: 'GET',
                credentials: 'include',
                headers: capturedHeaders
            }).then(res => res.json());
        }, apiUrlID, capturedHeaders);

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
