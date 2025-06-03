import express from 'express';
import bodyParser from 'body-parser';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { app_config } from './configs/app.config';
import indexRoute from './routes';

const app = express();
const port = app_config.app_port;

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb' }));

puppeteer.use(StealthPlugin());

app.use("/api", indexRoute);

app.listen(port, () => {
    console.log(`API running on http://localhost:${port}`);
});