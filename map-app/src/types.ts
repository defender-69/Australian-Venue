export interface Venue {
    "Venue name": string;
    "Site address": string;
    "Quote No": number | string;
    "Date": string;
    "Sub Total": number;
    "Scope brief": string;
    "State": string;
    "lat": number | null;
    "lng": number | null;
    "is_hq": boolean;
    "pdf_filename"?: string;
}

export type QuoteStatus = 'draft' | 'submitted' | 'won' | 'lost';

export interface Bundle {
    id: string;
    name: string;
    color: string;      // hex from 12-colour palette
    discount: number;   // 0–100 %
    venueNames: string[]; // exclusive — each venue belongs to at most one bundle
    notes: string;       // freeform estimator notes
}
