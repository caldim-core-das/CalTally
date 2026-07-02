const axios = require('axios');
const FormData = require('form-data');
const multer = require('multer');
const { BankTransaction } = require('../../models');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

exports.uploadMiddleware = upload.single('statement');

exports.parseStatement = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    // Send PDF to Setu Bank Statement Analysis API
    // Docs: https://docs.setu.co/data/bank-statement-analysis
    const form = new FormData();
    form.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: 'application/pdf'
    });
    form.append('password', req.body.password || ''); // for password-protected PDFs

    const { data } = await axios.post(
      'https://bsa-api.setu.co/statement',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'x-client-id': process.env.SETU_CLIENT_ID,
          'x-client-secret': process.env.SETU_CLIENT_SECRET,
        }
      }
    );

    // Map parsed transactions to BankTransaction
    const created = [];
    for (const tx of data.transactions || []) {
      const [record] = await BankTransaction.findOrCreate({
        where: { externalTxnId: tx.transaction_id || null, CompanyId: companyId },
        defaults: {
          CompanyId: companyId,
          date: new Date(tx.date),
          description: tx.narration,
          amount: Math.abs(tx.amount),
          type: tx.transaction_type === 'credit' ? 'Credit' : 'Debit',
          isMatched: false,
          sourceType: 'CSV_IMPORT',
          externalTxnId: tx.transaction_id || null
        }
      });
      created.push(record);
    }

    res.json({ imported: created.length, transactions: created });
  } catch (err) {
    next(err);
  }
};
