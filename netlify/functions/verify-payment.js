const crypto = require('crypto');

/**
 * Builds the confirmation email HTML.
 */
function getEmailTemplate(name, date, amount, orderId) {
    return `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            <div style="background: linear-gradient(90deg, #FF7A00, #FF3D00); padding: 40px 20px; text-align: center; border-radius: 16px 16px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Booking Confirmed!</h1>
            </div>
            <div style="background: white; padding: 40px 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                <p style="font-size: 18px; margin-bottom: 25px;">Hi <strong>${name}</strong>,</p>
                <p>Your adventure is officially on the calendar! We've received your payment and your tickets are now active.</p>
                
                <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 25px; margin: 30px 0;">
                    <h2 style="color: #FF7A00; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 15px 0;">Visit Summary</h2>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Visit Date</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: 600;">${date}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Amount Paid</td>
                            <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">₹${amount}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; color: #64748b;">Booking ID</td>
                            <td style="padding: 8px 0; text-align: right; font-family: monospace; font-size: 12px;">${orderId}</td>
                        </tr>
                    </table>
                </div>

                <div style="text-align: center; margin-top: 35px;">
                    <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">Simply show this email at the entrance to get your bands.</p>
                    <a href="https://bluesplash.in" style="display: inline-block; background: #0f172a; color: white; padding: 14px 30px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Visit Website</a>
                </div>
            </div>
            <div style="text-align: center; padding: 30px 20px; color: #94a3b8; font-size: 12px;">
                <p>&copy; 2026 Blue Splash Waterpark. All rights reserved.</p>
                <p>Puri-Konark Marine Drive, Beladal, Odisha</p>
            </div>
        </div>
    `;
}

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            user,
            date
        } = payload;

        const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const RAZORPAY_API_SECRET = process.env.RAZORPAY_API_SECRET;
        const BREVO_API_KEY = process.env.BREVO_API_KEY;

        // 1. Verify Signature locally (First line of defense)
        const generated_signature = crypto
            .createHmac('sha256', RAZORPAY_API_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            console.error("Signature Mismatch!");
            return { statusCode: 400, body: JSON.stringify({ error: "Payment verification failed" }) };
        }

        // 2. Fetch Source of Truth from Razorpay API
        const authString = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_API_SECRET}`).toString('base64');
        const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
            headers: { 'Authorization': `Basic ${authString}` }
        });

        if (!rzpResponse.ok) {
            return { statusCode: 400, body: JSON.stringify({ error: "Could not fetch payment details from Razorpay" }) };
        }

        const paymentData = await rzpResponse.json();

        // 3. Structural Cross-Check (Critical for P0 Security)
        if (paymentData.order_id !== razorpay_order_id || paymentData.status !== 'captured') {
            console.error("Payment Integrity Compromise Attempt", { 
                expectedOrder: razorpay_order_id, 
                actualOrder: paymentData.order_id,
                status: paymentData.status 
            });
            return { statusCode: 403, body: JSON.stringify({ error: "Payment integrity check failed" }) };
        }

        const captureAmount = (paymentData.amount / 100).toFixed(2); // Convert paise to INR

        // 4. Trigger Brevo Email using Authoritative Data
        if (BREVO_API_KEY && user && user.email) {
            try {
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "bookings@bluesplash.in";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "Blue Splash Waterpark";

const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
        'accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'content-type': 'application/json'
    },
    body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        to: [{ email: user.email, name: user.name || "Customer" }],
        subject: "Your Blue Splash Tickets Are Confirmed! 🌊",
        htmlContent: getEmailTemplate(user.name || 'Guest', date || 'TBD', captureAmount, razorpay_order_id)
    })
});

                if (!brevoResponse.ok) {
                    console.error("Brevo sending failed:", await brevoResponse.json());
                }
            } catch (emailErr) {
                console.error("Brevo request error:", emailErr);
            }
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        console.error("Verification Error:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};
