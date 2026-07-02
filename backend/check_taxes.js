const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');
db.all("SELECT id, name, openingBalance, openingBalanceType FROM Ledgers WHERE name LIKE '%tds%' OR name LIKE '%tcs%'", [], (err, rows) => {
  if(err) console.error(err);
  else console.table(rows);
  
  db.all("SELECT l.name, SUM(t.debit) as debits, SUM(t.credit) as credits FROM Transactions t JOIN Ledgers l ON t.LedgerId = l.id WHERE l.name LIKE '%tds%' OR l.name LIKE '%tcs%' GROUP BY l.id", [], (err2, rows2) => {
     if(err2) console.error(err2);
     else console.table(rows2);
     db.close();
  });
});
