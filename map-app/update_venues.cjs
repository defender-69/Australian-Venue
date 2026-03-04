const fs = require('fs');
const path = require('path');

const venuesPath = path.join(__dirname, 'src', 'venues.json');
const quotesPath = path.join(__dirname, 'public', 'quotes');

const venues = JSON.parse(fs.readFileSync(venuesPath, 'utf8'));
const files = fs.readdirSync(quotesPath).filter(f => f.endsWith('.pdf'));

let matched = 0;

for (const venue of venues) {
    if (venue['Quote No'] && venue['Quote No'] !== 'N/A') {
        const quoteNoStr = venue['Quote No'].toString().trim();
        const found = files.find(f => f.startsWith(quoteNoStr));
        if (found) {
            venue.pdf_filename = found;
            matched++;
        }
    }
}

fs.writeFileSync(venuesPath, JSON.stringify(venues, null, 4));
console.log(`Updated ${matched} venues with PDF filenames.`);
