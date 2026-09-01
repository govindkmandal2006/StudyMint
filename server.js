const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Website files
app.use(express.static(__dirname, {
    index: "index.html",
    extensions: ["html"]
}));


// ===============================
// CREATE CASHFREE ORDER
// ===============================

app.post("/create-order", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: "Email is required"
            });
        }

        const orderId = "BPSC105_" + Date.now();

        const response = await fetch(
            "https://sandbox.cashfree.com/pg/orders",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "x-api-version": "2025-01-01",
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET_KEY
                },
                body: JSON.stringify({
                    order_id: orderId,
                    order_amount: 29,
                    order_currency: "INR",

                    customer_details: {
                        customer_id: "student_" + Date.now(),
                        customer_email: email,
                        customer_phone: "9999999999"
                    },

                    order_meta: {
                        return_url:
                            "https://studymint.onrender.com/payment-success.html?order_id={order_id}"
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(data);

            return res.status(500).json({
                error: "Cashfree order creation failed"
            });
        }

        res.json({
            payment_session_id: data.payment_session_id,
            order_id: data.order_id
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Server error"
        });
    }
});


// ===============================
// VERIFY PAYMENT
// ===============================

app.get("/verify-payment/:orderId", async (req, res) => {
    try {
        const response = await fetch(
            `https://sandbox.cashfree.com/pg/orders/${req.params.orderId}/payments`,
            {
                headers: {
                    "Accept": "application/json",
                    "x-api-version": "2025-01-01",
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET_KEY
                }
            }
        );

        const payments = await response.json();

        if (!response.ok) {
            return res.status(500).json({
                success: false
            });
        }

        const paid = payments.some(
            payment => payment.payment_status === "SUCCESS"
        );

        res.json({
            success: paid
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false
        });
    }
});


// ===============================
// SECURE PDF DOWNLOAD
// ===============================

app.get("/download-assignment/:orderId", async (req, res) => {
    try {
        const response = await fetch(
            `https://sandbox.cashfree.com/pg/orders/${req.params.orderId}/payments`,
            {
                headers: {
                    "Accept": "application/json",
                    "x-api-version": "2025-01-01",
                    "x-client-id": process.env.CASHFREE_APP_ID,
                    "x-client-secret": process.env.CASHFREE_SECRET_KEY
                }
            }
        );

        const payments = await response.json();

        const paid = response.ok && payments.some(
            payment => payment.payment_status === "SUCCESS"
        );

        if (!paid) {
            return res.status(403).send("Payment required.");
        }

        res.sendFile(
            path.join(__dirname, "bpsc105-assignment.pdf")
        );

    } catch (error) {
        console.error(error);

        res.status(500).send("Unable to download assignment.");
    }
});


// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
    console.log(`StudyMint running on port ${PORT}`);
});
