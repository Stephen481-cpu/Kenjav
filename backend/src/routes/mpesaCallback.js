const express = require('express');
const crypto = require('crypto');
const { pool } = require('../db');
const router = express.Router();
function item(items,name){const x=items.find(i=>i.Name===name);return x?x.Value:null;}
router.post('/callback', async (req,res)=>{
  const expectedToken = process.env.MPESA_CALLBACK_SECRET;
  const providedToken = String(req.query.token || '');
  if (expectedToken) {
    const expected = Buffer.from(expectedToken);
    const provided = Buffer.from(providedToken);
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return res.status(403).json({ ResultCode: 1, ResultDesc: 'Unauthorized callback.' });
    }
  }
  const callback=req.body?.Body?.stkCallback;
  if(!callback)return res.status(200).json({ResultCode:0,ResultDesc:'Accepted'});
  try{
    const checkout=callback.CheckoutRequestID, code=Number(callback.ResultCode), items=Array.isArray(callback.CallbackMetadata?.Item)?callback.CallbackMetadata.Item:[], receipt=item(items,'MpesaReceiptNumber'), phone=item(items,'PhoneNumber');
    if (!checkout || !Number.isInteger(code) || (code === 0 && !receipt)) {
      return res.status(400).json({ ResultCode: 1, ResultDesc: 'Invalid callback payload.' });
    }
    const order=await pool.query('SELECT id,payment_status FROM orders WHERE mpesa_checkout_request_id=$1 LIMIT 1',[checkout]);
    if(order.rowCount && order.rows[0].payment_status!=='paid') await pool.query(code===0?`UPDATE orders SET payment_status='paid',mpesa_receipt_number=$1,mpesa_phone=$2,updated_at=NOW() WHERE id=$3`:`UPDATE orders SET payment_status='failed',updated_at=NOW() WHERE id=$1`,code===0?[receipt,phone,order.rows[0].id]:[order.rows[0].id]);
    const payment=await pool.query('SELECT * FROM payments WHERE mpesa_checkout_request_id=$1 LIMIT 1',[checkout]);
    if(payment.rowCount && !['confirmed','rejected'].includes(payment.rows[0].status)){
      const p=payment.rows[0];
      if(code===0){await pool.query(`UPDATE payments SET status='confirmed',mpesa_receipt_number=$1,mpesa_phone=$2,date=NOW() WHERE id=$3`,[receipt,phone,p.id]);await pool.query(`INSERT INTO wholesale_notifications(shopkeeper_id,title,message) VALUES($1,'M-Pesa payment confirmed',$2)`,[p.shopkeeper_id,`Your M-Pesa payment of KES ${Number(p.amount_kes).toLocaleString()} was confirmed${receipt?` (receipt ${receipt})`:''}.`]);}
      else{await pool.query(`UPDATE payments SET status='rejected',date=NOW() WHERE id=$1`,[p.id]);await pool.query(`INSERT INTO wholesale_notifications(shopkeeper_id,title,message) VALUES($1,'M-Pesa payment failed',$2)`,[p.shopkeeper_id,`Your M-Pesa payment of KES ${Number(p.amount_kes).toLocaleString()} was not completed.`]);}
    }
  }catch(error){console.error('M-Pesa callback error:',error)}
  return res.status(200).json({ResultCode:0,ResultDesc:'Accepted'});
});
module.exports=router;
