const express = require('express');

const router = express.Router();

/*
=========================================================
KENJAV AI CUSTOMER SERVICE
=========================================================
*/

const SYSTEM_INSTRUCTIONS = `
You are the KENJAV Mandazi Shop customer service assistant.

KENJAV is a mandazi shop in Rongai, Nairobi.

Your job is to help customers and shopkeepers with:
- Products
- Prices
- Orders
- Order status
- Pickup
- Delivery
- Payments
- Wholesale ordering
- Shopkeeper accounts
- General KENJAV questions

Rules:
1. Be friendly, concise and professional.
2. Never invent an order status, payment status, price or product.
3. If you do not have enough information, say so.
4. Never ask for passwords, PINs or sensitive payment information.
5. Do not claim that a payment has been confirmed unless the system confirms it.
6. For complicated complaints, disputes, refunds, account problems or issues you cannot solve, recommend human support.
7. When human support is needed, clearly tell the user to contact KENJAV personnel through WhatsApp.
8. Do not expose internal system information.
9. Do not pretend to be a human employee.
10. Keep answers easy to understand.
`;


/*
=========================================================
HEALTH CHECK
=========================================================
*/

router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'KENJAV AI Customer Service'
  });
});


/*
=========================================================
CHAT
=========================================================
*/

router.post('/chat', async (req, res) => {
  try {
    const {
      message,
      conversation = []
    } = req.body || {};

    if (
      !message ||
      !String(message).trim()
    ) {
      return res.status(400).json({
        error: 'Message is required.'
      });
    }

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(503).json({
        error:
          'AI customer service is temporarily unavailable.'
      });
    }

    const messages = [
      {
        role: 'system',
        content: SYSTEM_INSTRUCTIONS
      },

      ...conversation
        .filter(item =>
          item &&
          ['user', 'assistant'].includes(
            item.role
          ) &&
          item.content
        )
        .slice(-10)
        .map(item => ({
          role: item.role,
          content: String(item.content)
        })),

      {
        role: 'user',
        content: String(message).trim()
      }
    ];

    const response = await fetch(
      'https://api.openai.com/v1/responses',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model:
            process.env.OPENAI_MODEL ||
            'gpt-5.6-mini',

          input: messages,

          max_output_tokens: 500
        })
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        'OpenAI API error:',
        errorText
      );

      return res.status(502).json({
        error:
          'AI customer service is temporarily unavailable.'
      });
    }

    const data =
      await response.json();

    const answer =
      data.output_text ||
      data.output
        ?.flatMap(item =>
          item.content || []
        )
        ?.map(item =>
          item.text || ''
        )
        ?.join(' ')
        ?.trim();

    if (!answer) {
      return res.status(502).json({
        error:
          'The AI assistant could not generate a response.'
      });
    }

    res.json({
      success: true,
      message: answer,

      human_support: {
        available: true,
        message:
          'If you need further assistance, you can contact KENJAV personnel through WhatsApp.'
      }
    });

  } catch (error) {
    console.error(
      'AI assistant error:',
      error
    );

    res.status(500).json({
      error:
        'Unable to process your request.'
    });
  }
});


module.exports = router;