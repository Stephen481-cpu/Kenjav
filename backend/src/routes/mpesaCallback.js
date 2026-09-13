const express = require('express');
const { pool } = require('../db');

const router = express.Router();

function getCallbackValue(items, name) {
  const found = items.find(
    (item) => item.Name === name
  );

  return found ? found.Value : null;
}

router.post('/callback', async (req, res) => {
  /*
    Safaricom expects an acknowledgement.
    Always return HTTP 200 so the callback is accepted.
  */
  try {
    const callback =
      req.body &&
      req.body.Body &&
      req.body.Body.stkCallback;

    if (!callback) {
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Accepted'
      });
    }

    const {
      CheckoutRequestID,
      MerchantRequestID,
      ResultCode,
      CallbackMetadata
    } = callback;

    if (!CheckoutRequestID) {
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Accepted'
      });
    }

    /*
      ========================================================
      1. NORMAL CUSTOMER ORDER
      ========================================================
    */

    const orderResult = await pool.query(
      `
      SELECT *
      FROM orders
      WHERE mpesa_checkout_request_id = $1
      LIMIT 1
      `,
      [CheckoutRequestID]
    );

    const order = orderResult.rows[0];

    if (order) {
      if (order.payment_status !== 'paid') {
        if (Number(ResultCode) === 0) {
          const items =
            CallbackMetadata?.Item || [];

          const receipt =
            getCallbackValue(
              items,
              'MpesaReceiptNumber'
            );

          const phone =
            getCallbackValue(
              items,
              'PhoneNumber'
            );

          await pool.query(
            `
            UPDATE orders

            SET
              payment_status = 'paid',
              mpesa_receipt_number = $1,
              mpesa_phone = $2,
              mpesa_merchant_request_id =
                COALESCE(
                  $3,
                  mpesa_merchant_request_id
                ),
              updated_at = CURRENT_TIMESTAMP

            WHERE id = $4
            `,
            [
              receipt
                ? String(receipt)
                : null,
              phone
                ? String(phone)
                : null,
              MerchantRequestID
                ? String(MerchantRequestID)
                : null,
              order.id
            ]
          );
        } else {
          await pool.query(
            `
            UPDATE orders

            SET
              payment_status = 'failed',
              mpesa_merchant_request_id =
                COALESCE(
                  $1,
                  mpesa_merchant_request_id
                ),
              updated_at = CURRENT_TIMESTAMP

            WHERE id = $2
            `,
            [
              MerchantRequestID
                ? String(MerchantRequestID)
                : null,
              order.id
            ]
          );
        }
      }

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Accepted'
      });
    }


    /*
      ========================================================
      2. WHOLESALE SHOPKEEPER PAYMENT
      ========================================================
    */

    const paymentResult = await pool.query(
      `
      SELECT *
      FROM payments
      WHERE mpesa_checkout_request_id = $1
      LIMIT 1
      `,
      [CheckoutRequestID]
    );

    const payment = paymentResult.rows[0];

    if (payment) {
      if (
        !['confirmed', 'rejected'].includes(
          payment.status
        )
      ) {
        if (Number(ResultCode) === 0) {
          const items =
            CallbackMetadata?.Item || [];

          const receipt =
            getCallbackValue(
              items,
              'MpesaReceiptNumber'
            );

          const phone =
            getCallbackValue(
              items,
              'PhoneNumber'
            );

          await pool.query(
            `
            UPDATE payments

            SET
              status = 'confirmed',
              mpesa_receipt_number = $1,
              mpesa_phone = $2,
              mpesa_merchant_request_id =
                COALESCE(
                  $3,
                  mpesa_merchant_request_id
                ),

              reference =
                COALESCE(
                  reference,
                  $1
                )

            WHERE id = $4
            `,
            [
              receipt
                ? String(receipt)
                : null,

              phone
                ? String(phone)
                : null,

              MerchantRequestID
                ? String(MerchantRequestID)
                : null,

              payment.id
            ]
          );

          try {
            await pool.query(
              `
              INSERT INTO wholesale_notifications
              (
                shopkeeper_id,
                title,
                message
              )
              VALUES
              ($1, $2, $3)
              `,
              [
                payment.shopkeeper_id,
                'M-Pesa payment confirmed',
                `Your M-Pesa payment of KES ${Number(
                  payment.amount_kes
                ).toLocaleString()} has been confirmed${
                  receipt
                    ? ` with receipt ${receipt}.`
                    : '.'
                }`
              ]
            );
          } catch (notificationError) {
            console.error(
              'Wholesale payment notification failed:',
              notificationError
            );
          }
        } else {
          await pool.query(
            `
            UPDATE payments

            SET
              status = 'failed',
              mpesa_merchant_request_id =
                COALESCE(
                  $1,
                  mpesa_merchant_request_id
                )

            WHERE id = $2
            `,
            [
              MerchantRequestID
                ? String(MerchantRequestID)
                : null,
              payment.id
            ]
          );

          try {
            await pool.query(
              `
              INSERT INTO wholesale_notifications
              (
                shopkeeper_id,
                title,
                message
              )
              VALUES
              ($1, $2, $3)
              `,
              [
                payment.shopkeeper_id,
                'M-Pesa payment failed',
                `Your M-Pesa payment of KES ${Number(
                  payment.amount_kes
                ).toLocaleString()} was not completed.`
              ]
            );
          } catch (notificationError) {
            console.error(
              'Wholesale payment notification failed:',
              notificationError
            );
          }
        }
      }
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  } catch (error) {
    console.error(
      'M-Pesa callback error:',
      error
    );

    /*
      Safaricom should still receive a successful
      acknowledgement even if our internal processing
      encounters a temporary problem.
    */
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: 'Accepted'
    });
  }
});

module.exports = router;