import fs from 'fs';
import path from 'path';
import { parseCsv } from '$lib/csvProcessor.js';
import { json } from '@sveltejs/kit';

export async function GET() {
    try {
        // Read the input.csv file
        const inputPath = path.join(process.cwd(), 'static', 'input.csv');
        
        if (!fs.existsSync(inputPath)) {
            return json({ error: 'Input CSV file not found' }, { status: 404 });
        }

        const inputCsv = fs.readFileSync(inputPath, 'utf-8');
        const inputData = parseCsv(inputCsv);
        
        // Create a map of school codes to their class counts
        const schoolBookData = new Map();
        
        inputData.forEach(row => {
            const schoolCode = row.CODICESCUOLA;
            if (schoolCode) {
                if (!schoolBookData.has(schoolCode)) {
                    schoolBookData.set(schoolCode, new Set());
                }
                // Add class identifier (combination of year and section)
                const classId = `${row.ANNOCORSO || ''}${row.SEZIONEANNO || ''}`;
                if (classId.trim()) {
                    schoolBookData.get(schoolCode).add(classId);
                }
            }
        });
        
        // Convert to simple object with school code as key and class count as value
        const result = {};
        schoolBookData.forEach((classes, schoolCode) => {
            result[schoolCode] = classes.size;
        });
        
        return json(result);
    } catch (error) {
        console.error('Error processing school book data:', error);
        return json({ error: 'Failed to process school book data' }, { status: 500 });
    }
}
