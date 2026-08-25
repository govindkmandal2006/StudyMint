const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;

app.post("/create-order", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                error: "Email is required"
            });
        }

        const orderId =
            "BPSC105_" +
            Date.now();

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
                error: "Cashfree order creation failed",
                details: data
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

app.listen(PORT, () => {
    console.log(`StudyMint running on port ${PORT}`);
});
