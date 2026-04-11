// Load prices from shared configuration
let prices;
try {
    const config = require('../../shared/prices.json');
    prices = config.prices;
} catch (err) {
    console.error("Failed to load prices.json, using fallback", err);
    prices = {
        waterpark: 599,
        amusement: 499,
        combo: 899,
        vip: 1199,
        student: 399,
        family: 1999,
        group: 499
    };
}

// Strict list of allowed ticket types
const ALLOWED_TICKETS = Object.keys(prices);

function getGrandTotal(quantities) {
    let total = 0;
    
    // Only process allowed keys to prevent injection of unknown data
    for (const type of ALLOWED_TICKETS) {
        const qty = parseInt(quantities[type], 10);
        if (isNaN(qty) || qty <= 0) continue;

        if (type === 'group') {
            // Group Offer: Buy 4, Get 1 Free
            const freeTickets = Math.floor(qty / 5);
            const chargedQty = qty - freeTickets;
            total += chargedQty * prices.group;
        } else if (type === 'family') {
            // Family Pack pricing
            total += qty * prices.family;
        } else {
            // Standard ticket pricing
            total += qty * prices[type];
        }
    }
    return total;
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);
        const quantities = payload.quantities || {};
        
        const total = getGrandTotal(quantities);
        
        if (total <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: "Invalid cart quantities or amount is zero." })
            };
        }

        const amountInPaise = Math.round(total * 100);

        // Fetch Razorpay credentials securely
        const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const RAZORPAY_API_SECRET = process.env.RAZORPAY_API_SECRET;

        if (!RAZORPAY_KEY_ID || !RAZORPAY_API_SECRET) {
            console.error("Missing Razorpay Keys");
            return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Configuration Error" }) };
        }

        // Base64 Authorization string
        const authString = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_API_SECRET}`).toString('base64');

        // Create Order via Razorpay API
        const response = await fetch('https://api.razorpay.com/v1/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify({
                amount: amountInPaise,
                currency: 'INR',
                receipt: `bs_receipt_${Date.now()}`
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Razorpay Error:", data);
            return { statusCode: response.status, body: JSON.stringify({ error: "Failed to create order" }) };
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: data.id,
                amount: amountInPaise,
                currency: "INR",
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
            })
        };
    } catch (error) {
        console.error("Function error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" })
        };
    }
};
