const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware configuration for parsing incoming json payloads
app.use(express.json());

// Setup matching Ad Cost mapping object to match frontend selections exactly
const channelCosts = {
    'Google Ads': 5000,
    'Facebook Ads': 4000,
    'Email': 800,
    'SEO': 1200,
    'Influencer': 3000
};

// Log dataset arrays to simulate historical user interactions
let conversionPaths = [
    { path: ['Influencer', 'Facebook Ads', 'Email'], revenue: 1200 },
    { path: ['Google Ads', 'SEO'], revenue: 800 },
    { path: ['Facebook Ads', 'Google Ads'], revenue: 1500 },
    { path: ['SEO', 'Email'], revenue: 400 },
    { path: ['Google Ads', 'Facebook Ads', 'Email'], revenue: 2000 },
    { path: ['Influencer', 'SEO', 'Google Ads'], revenue: 3500 },
    { path: ['Facebook Ads'], revenue: 600 }
];

// Attribution Calculation Function
function runAdvancedAttribution(model) {
    const revenueAllocation = { 'Google Ads': 0, 'Facebook Ads': 0, 'Email': 0, 'SEO': 0, 'Influencer': 0 };
    const assistedConversions = { 'Google Ads': 0, 'Facebook Ads': 0, 'Email': 0, 'SEO': 0, 'Influencer': 0 };

    conversionPaths.forEach(event => {
        const pathArr = event.path;
        const totalRev = event.revenue;
        const n = pathArr.length;

        // Calculate Assisted Conversions
        const uniqueChannelsInPath = [...new Set(pathArr)];
        uniqueChannelsInPath.forEach(channel => {
            if (pathArr[n - 1] !== channel) {
                assistedConversions[channel] += 1;
            }
        });

        // Split Selection Logic Router 
        if (model === 'first-touch') {
            revenueAllocation[pathArr[0]] += totalRev;
        } 
        else if (model === 'last-touch') {
            revenueAllocation[pathArr[n - 1]] += totalRev;
        } 
        else if (model === 'linear') {
            const splitValue = totalRev / n;
            pathArr.forEach(channel => { revenueAllocation[channel] += splitValue; });
        } 
        else if (model === 'position-based') {
            if (n === 1) {
                revenueAllocation[pathArr[0]] += totalRev;
            } else if (n === 2) {
                revenueAllocation[pathArr[0]] += totalRev * 0.5;
                revenueAllocation[pathArr[1]] += totalRev * 0.5;
            } else {
                revenueAllocation[pathArr[0]] += totalRev * 0.4;
                revenueAllocation[pathArr[n - 1]] += totalRev * 0.4;
                const midShare = (totalRev * 0.2) / (n - 2);
                for (let i = 1; i < n - 1; i++) { revenueAllocation[pathArr[i]] += midShare; }
            }
        }
    });

    return Object.keys(channelCosts).map(channel => {
        const calculatedRev = Math.round(revenueAllocation[channel] || 0);
        const actualCost = channelCosts[channel];
        const calculatedRoas = actualCost > 0 ? parseFloat((calculatedRev / actualCost).toFixed(2)) : 0;
        const calculatedRoi = actualCost > 0 ? Math.round(((calculatedRev - actualCost) / actualCost) * 100) : 0;

        return {
            channel,
            cost: actualCost,
            revenue: calculatedRev,
            roas: calculatedRoas,
            roi: calculatedRoi,
            assistCount: assistedConversions[channel] || 0
        };
    });
}

// Endpoint 1: Serves parsed model configuration dataset payloads
app.get('/api/attribution', (req, res) => {
    const selectedModel = req.query.model || 'linear';
    res.json(runAdvancedAttribution(selectedModel));
});

// Endpoint 2: Appends real-time simulation updates
app.post('/api/simulate-conversion', (req, res) => {
    const { path, revenue } = req.body;
    if (!path || !path.length || !revenue) {
        return res.status(400).json({ error: "Invalid transformation request parameters." });
    }
    conversionPaths.push({ path, revenue: parseFloat(revenue) });
    res.json({ success: true, totalPathsCount: conversionPaths.length });
});

// Endpoint 3: Directly matches lookups to serve your individual index.html from your root directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`[SERVER OK] Secure analytics backend listening at: http://localhost:${PORT}`);
});
