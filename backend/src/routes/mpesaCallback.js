const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.post('/callback', async (req, res) => {
  try {
    const callback = req.body && req.body.Body && req.body.Body.stkCallback;
    if (!callback) return res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;
    const { rows } = await pool.query('SELECT * FROM orders WHERE mpesa_checkout_request_id=$1 LIMIT 1', [CheckoutRequestID]);
    const order = rows[0];

    if (order && order.payment_status !== 'paid') {
      if (Number(ResultCode) === 0) {
        const items = (CallbackMetadata && CallbackMetadata.Item) || [];
        const get = (name) => {
          const found = items.find((i) => i.Name === name);
          return found ? found.Value : null;
        };
        await pool.query(
          `UPDATE orders SET payment_status='paid', mpesa_receipt_number=$1, mpesa_phone=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3`,
          [get('MpesaReceiptNumber') ? String(get('MpesaReceiptNumber')) : null, get('PhoneNumber') ? String(get('PhoneNumber')) : null, order.id]
        );
      } else {
        await pool.query(`UPDATE orders SET payment_status='failed', updated_at=CURRENT_TIMESTAMP WHERE id=$1`, [order.id]);
      }
    }

    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('M-Pesa callback error:', err);
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

module.exports = router;
