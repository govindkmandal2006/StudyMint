const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

/* =====================================
   ALL COURSES
===================================== */

const COURSES = {
  "BPSC-104": {
    prefix: "BPSC104_",
    pdf: "bpsc104-assignment.pdf",
    download: "BPSC-104-Solved-Assignment.pdf"
  },

  "BPSC-105": {
    prefix: "BPSC105_",
    pdf: "bpsc105-assignment.pdf",
    download: "BPSC-105-Solved-Assignment.pdf"
  },

  "BSOM-162": {
    prefix: "BSOM162_",
    pdf: "bsom162-assignment.pdf",
    download: "BSOM-162-Solved-Assignment.pdf"
  },

  "BSSS-183": {
    prefix: "BSSS183_",
    pdf: "bsss183-assignment.pdf",
    download: "BSSS-183-Solved-Assignment.pdf"
  },

  "BHDAE-182": {
    prefix: "BHDAE182_",
    pdf: "bhdae182-assignment.pdf",
    download: "BHDAE-182-Solved-Assignment.pdf"
  }
};

/* =====================================
   BLOCK DIRECT PDF ACCESS
===================================== */

Object.values(COURSES).forEach(course => {
  app.get("/" + course.pdf, (req, res) => {
    res.status(403).send("Direct access is not allowed.");
  });
});

/* =====================================
   STATIC FILES
===================================== */

app.use(express.static(__dirname));

/* =====================================
   CREATE ORDER
===================================== */

app.post("/create-order", async (req, res) => {
  try {

    const { email, course } = req.body;

    if (!email)
      return res.status(400).json({
        error: "Email required"
      });

    if (!COURSES[course])
      return res.status(400).json({
        error: "Invalid course"
      });

    const orderId =
      COURSES[course].prefix + Date.now();

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
        error: "Cashfree order failed"
      });
    }

    res.json({
      payment_session_id: data.payment_session_id,
      order_id: data.order_id
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: "Server error"
    });

  }
});

/* =====================================
   FIND COURSE FROM ORDER
===================================== */

function getCourseFromOrder(orderId) {

  for (const code in COURSES) {

    if (orderId.startsWith(COURSES[code].prefix)) {
      return code;
    }

  }

  return null;
}

/* =====================================
   VERIFY PAYMENT
===================================== */

app.get("/verify-payment/:orderId", async (req, res) => {

  try {

    const orderId = req.params.orderId;

    const course =
      getCourseFromOrder(orderId);

    if (!course)
      return res.status(400).json({
        success: false
      });

    const response = await fetch(
      `https://sandbox.cashfree.com/pg/orders/${encodeURIComponent(orderId)}/payments`,
      {
        method: "GET",

        headers: {
          "Accept": "application/json",
          "x-api-version": "2025-01-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY
        }
      }
    );

    const payments = await response.json();

    const paid = payments.some(
      p => p.payment_status === "SUCCESS"
    );

    res.json({
      success: paid,
      course
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      success: false
    });

  }

});

/* =====================================
   DOWNLOAD PDF
===================================== */

app.get("/download-assignment/:orderId", async (req, res) => {

  try {

    const orderId = req.params.orderId;

    const course =
      getCourseFromOrder(orderId);

    if (!course)
      return res.status(403).send("Invalid order.");

    const response = await fetch(
      `https://sandbox.cashfree.com/pg/orders/${encodeURIComponent(orderId)}/payments`,
      {
        method: "GET",

        headers: {
          "Accept": "application/json",
          "x-api-version": "2025-01-01",
          "x-client-id": process.env.CASHFREE_APP_ID,
          "x-client-secret": process.env.CASHFREE_SECRET_KEY
        }
      }
    );

    const payments = await response.json();

    const paid = payments.some(
      p => p.payment_status === "SUCCESS"
    );

    if (!paid)
      return res.status(403).send("Payment required.");

    const pdfPath = path.join(
      __dirname,
      COURSES[course].pdf
    );

    res.download(
      pdfPath,
      COURSES[course].download
    );

  } catch (err) {

    console.error(err);

    res.status(500).send("Download failed.");

  }

});

/* =====================================
   START SERVER
===================================== */

app.listen(PORT, () => {
  console.log(`StudyMint running on ${PORT}`);
});
