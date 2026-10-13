const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sms_ingestion';
const MONGO_OPTIONS = {
  family: 4,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

function parseMessage(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return null;

  let lines = text
    .replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  if (!lines.length) return null;
  if (lines.length === 1 && lines[0].includes(',') && lines[0].includes(':')) {
    lines = lines[0].split(/\s*,\s*/).map(l => l.trim()).filter(Boolean);
  }

  const result = {
    company: null,
    receipt: null,
    gross: null,
    tare: null,
    net: null,
    vehicle: null,
    product: null,
    party: null,
    location: null,
    dates: [],
  };

  const parseNum = (str) => {
    try {
      const match = str.match(/([\d,]+\.?\d*)/);
      return match ? parseFloat(match[1].replace(/,/g, '')) : null;
    } catch {
      return null;
    }
  };

  const after = (line, re) => line.replace(re, '').trim() || null;

  for (const line of lines) {
    try {
      if (/^G\s*:/i.test(line)) { result.gross = parseNum(line.replace(/^G\s*:/i, '')); continue; }
      if (/^T\s*:/i.test(line)) { result.tare = parseNum(line.replace(/^T\s*:/i, '')); continue; }
      if (/^N\s*:/i.test(line)) { result.net = parseNum(line.replace(/^N\s*:/i, '')); continue; }
      if (/^GROSS\s+WEIGHT\b/i.test(line)) { result.gross = parseNum(line); continue; }
      if (/^TARE\s+WEIGHT\b/i.test(line)) { result.tare = parseNum(line); continue; }
      if (/^NET\s+WEIGHT\b/i.test(line)) { result.net = parseNum(line); continue; }
      if (/^R\s*:/i.test(line)) { result.receipt = after(line, /^R\s*:/i); continue; }
      if (/^RST\s*:/i.test(line)) { result.receipt = after(line, /^RST\s*:/i); continue; }
      if (/^D\s*:/i.test(line)) { const d = after(line, /^D\s*:/i); if (d) result.dates.push(d); continue; }
      if (/^DATE(?:_1)?\s*:/i.test(line)) {
        let d = after(line, /^DATE(?:_1)?\s*:/i);
        if (d) {
          const timeMatch = d.match(/TIME(?:_1)?\s*:\s*([^,]+)/i);
          if (timeMatch) {
            d = d.replace(/,?\s*TIME(?:_1)?\s*:\s*([^,]+)/i, '').trim();
            d = `${d} ${timeMatch[1]}`.trim();
          }
          result.dates.push(d);
        }
        continue;
      }
      if (/^TIME(?:_1)?\s*:/i.test(line)) {
        const t = after(line, /^TIME(?:_1)?\s*:/i);
        if (t && result.dates.length) {
          result.dates[result.dates.length - 1] = `${result.dates[result.dates.length - 1]} ${t}`.trim();
        }
        continue;
      }
      if (/^VE\s*[-:\s]/i.test(line)) { result.vehicle = after(line, /^VE\s*[-:\s]/i); continue; }
      if (/^VEHICLE\s+NO\s*:/i.test(line)) { result.vehicle = after(line, /^VEHICLE\s+NO\s*:/i); continue; }
      if (/^PR\s*[-:\s]/i.test(line)) { result.product = after(line, /^PR\s*[-:\s]/i); continue; }
      if (/^PROD\s+NAME\s*:/i.test(line)) { result.product = after(line, /^PROD\s+NAME\s*:/i); continue; }
      if (/^PA\s*[-:\s]/i.test(line)) { result.party = after(line, /^PA\s*[-:\s]/i); continue; }
      if (/^PARTY\s+NAME\s*:/i.test(line)) { result.party = after(line, /^PARTY\s+NAME\s*:/i); continue; }
      if (/^TP\s*[-:\s]/i.test(line)) { result.location = after(line, /^TP\s*[-:\s]/i); continue; }
      if (/^TPT\s+NAME\s*:/i.test(line)) { result.location = after(line, /^TPT\s+NAME\s*:/i); continue; }
      if (!result.company) { result.company = line; }
    } catch {
      // skip malformed lines
    }
  }

  return result;
}

const RawMessage = mongoose.model('RawMessage', new mongoose.Schema({
  text:      { type: String, required: true },
  source:    { type: String, default: 'manual' },
  createdAt: { type: Date, default: Date.now },
}));

const ParsedMessage = mongoose.model('ParsedMessage', new mongoose.Schema({
  rawMessageId: { type: mongoose.Schema.Types.ObjectId, ref: 'RawMessage' },
  company:      String,
  receipt:      String,
  gross:        Number,
  tare:         Number,
  net:          Number,
  vehicle:      String,
  product:      String,
  party:        String,
  location:     String,
  dates:        [String],
  pricePerKg:   { type: Number, default: 0 },
  value:        { type: Number, default: 0 },
  createdAt:    { type: Date, default: Date.now },
}));

const Pricing = mongoose.model('Pricing', new mongoose.Schema({
  product:    { type: String, required: true, unique: true },
  pricePerKg: { type: Number, required: true },
  createdAt:  { type: Date, default: Date.now },
}));

async function run() {
  await mongoose.connect(MONGO_URI, MONGO_OPTIONS);
  console.log('Connected to', MONGO_URI);

  const rawMessages = await RawMessage.find().lean();
  console.log('Found raw messages:', rawMessages.length);

  for (const raw of rawMessages) {
    const parsedData = parseMessage(raw.text);
    if (!parsedData) continue;

    const pricing = parsedData.product ? await Pricing.findOne({ product: parsedData.product }) : null;
    const pricePerKg = pricing ? pricing.pricePerKg : 0;
    const value = (parsedData.net ?? 0) * pricePerKg;

    const existing = await ParsedMessage.findOne({ rawMessageId: raw._id });
    if (existing) {
      await ParsedMessage.updateOne({ _id: existing._id }, {
        $set: {
          ...parsedData,
          pricePerKg,
          value,
        },
      });
      console.log('Updated parsed message for raw', raw._id.toString());
    } else {
      await ParsedMessage.create({
        rawMessageId: raw._id,
        ...parsedData,
        pricePerKg,
        value,
      });
      console.log('Created parsed message for raw', raw._id.toString());
    }
  }

  console.log('Reparse complete');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
