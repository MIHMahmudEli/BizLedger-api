// cPanel/Passenger startup file.
// Passenger loads the startup file with require(), which cannot load an ESM
// module that uses top-level await (dist/main.js does). Dynamic import() can.
import('./dist/main.js').catch((err) => {
  console.error('Failed to start BizLedger API', err);
  process.exit(1);
});
