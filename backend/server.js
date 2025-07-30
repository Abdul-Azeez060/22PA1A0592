const express = require('express');
const bodyParser = require('body-parser');
const validUrl = require('valid-url');
const { Log, loggingMiddleware } = require('./middleware');
const cors = require('cors'); 
const app = express();
const PORT = 4000;
const HOSTNAME = `http://localhost:${PORT}`;


app.use(cors()); 

app.use(bodyParser.json());
app.use(loggingMiddleware);

const urls = {};
const clicks = {};

function generateShortcode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    do {
        code = Array(6).fill(0).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (urls[code]);
    return code;
}

function isValidShortcode(code) {
    return /^[a-zA-Z0-9]{4,}$/.test(code);
}

function getExpiryDate(minutes) {
    const d = new Date();
    d.setMinutes(d.getMinutes() + minutes);
    return d;
}

app.post('/shorturls', async (req, res) => {
    const { url, validity, shortcode } = req.body;
    if (!url || !validUrl.isUri(url)) {
        await Log('backend', 'error', 'handler', 'invalid or missing url');
        return res.status(400).json({ error: 'Invalid or missing URL' });
    }
    let shortCode = '';
    if (shortcode) {
        if (!isValidShortcode(shortcode)) {
            await Log('backend', 'error', 'handler', 'invalid custom shortcode');
            return res.status(400).json({ error: 'Invalid custom shortcode. Must be alphanumeric and at least 4 characters.' });
        }
        if (urls[shortcode]) {
            await Log('backend', 'warn', 'handler', 'shortcode already exists');
            return res.status(409).json({ error: 'Shortcode already exists' });
        }
        shortCode = shortcode;
    } else {
        shortCode = generateShortcode();
    }
    let duration = 30;
    if (validity !== undefined) {
        if (!Number.isInteger(validity) || validity < 1) {
            await Log('backend', 'error', 'handler', 'invalid validity minutes');
            return res.status(400).json({ error: 'Validity must be a positive integer (minutes)' });
        }
        duration = validity;
    }
    const expiryDate = getExpiryDate(duration);

    urls[shortCode] = {
        url,
        createdAt: new Date(),
        expiry: expiryDate,
        clicks: 0
    };
    clicks[shortCode] = [];
    await Log('backend', 'info', 'handler', `shortcode created: ${shortCode}`); 
    res.status(201).json({
        shortLink: `${HOSTNAME}/shorturls/${shortCode}`, 
        expiry: expiryDate.toISOString()
    });
});

app.get('/shorturls/:shortcode', async (req, res) => {
    const { shortcode } = req.params;
    const entry = urls[shortcode];
    if (!entry) {
        await Log('backend', 'warn', 'handler', 'shortcode not found');
        return res.status(404).json({ error: 'Shortcode not found' });
    }
    if (entry.expiry < new Date()) {
        await Log('backend', 'fatal', 'handler', `expired shortcode: ${shortcode}`); 
        return res.status(410).json({ error: 'Short URL has expired' });
    }
    entry.clicks++;
    clicks[shortcode].push({
        timestamp: new Date().toISOString(),
        referrer: req.get('referrer') || null,
        ip: req.ip
    });
    await Log('backend', 'info', 'handler', `redirect for shortcode: ${shortcode}`); 
    res.redirect(entry.url);
});

app.get('/shorturls/:shortcode/stats', async (req, res) => {
    const { shortcode } = req.params;
    const entry = urls[shortcode];
    if (!entry) {
        await Log('backend', 'error', 'handler', 'analytics for unknown shortcode');
        return res.status(404).json({ error: 'Shortcode not found' });
    }
    const allClicks = clicks[shortcode] || [];
    await Log('backend', 'info', 'handler', `serving analytics for ${shortcode}`); 
    res.json({
        shortcode,
        originalUrl: entry.url,
        createdAt: entry.createdAt,
        expiry: entry.expiry,
        totalClicks: entry.clicks,
        clickDetails: allClicks.map(click => ({
            timestamp: click.timestamp,
            referrer: click.referrer,
            ip: click.ip
        }))
    });
});


app.use(async (err, req, res, next) => {
    await Log('backend', 'fatal', 'handler', 'unexpected server error');
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`URL Shortener running at ${HOSTNAME}`); 
    Log('backend', 'info', 'service', `url shortener running at ${HOSTNAME}`);
});
