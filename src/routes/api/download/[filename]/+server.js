import { error } from '@sveltejs/kit';
import { getData, deleteData } from '$lib/storage.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
    const filename = params.filename;
      // Extract unique ID from filename
    const match = filename.match(/^(CercaListe|listelibri|scuoleterritorio)_([a-zA-Z0-9]{8})\.csv$/);
    
    console.log('Filename:', filename);
    console.log('Regex match:', match);
    
    if (!match) {
        console.log('Filename did not match regex pattern');
        throw error(404, 'File non trovato');
    }
    
    const [, fileType, uniqueId] = match;
    
    // Get data from the shared storage
    const sessionData = getData(uniqueId);
    
    console.log('Download request for uniqueId:', uniqueId);
    console.log('Session data found:', !!sessionData);
      if (!sessionData) {
        console.log('No session data found for uniqueId:', uniqueId);
        throw error(404, 'File non trovato o scaduto');
    }
    
    console.log('Session data keys:', Object.keys(sessionData));
    console.log('Session data structure:', {
        hasOutput1: 'output1' in sessionData,
        hasOutput2: 'output2' in sessionData,
        hasSchoolTerritory: 'schoolTerritory' in sessionData,
        output1Length: sessionData.output1?.length,
        output2Length: sessionData.output2?.length,
        schoolTerritoryLength: sessionData.schoolTerritory?.length
    });
    
    let csvContent;
    switch (fileType) {
        case 'CercaListe':
            csvContent = sessionData.output1;
            break;
        case 'listelibri':
            csvContent = sessionData.output2;
            break;
        case 'scuoleterritorio':
            csvContent = sessionData.schoolTerritory;
            break;
        default:
            throw error(404, 'File non trovato');
    }
      console.log('CSV content length:', csvContent ? csvContent.length : 'null');
    console.log('CSV content preview:', csvContent ? csvContent.substring(0, 100) : 'null');
      if (!csvContent) {
        console.log('CSV content is empty or null for fileType:', fileType);
        throw error(404, 'File content not found');
    }
    
    // Don't delete data immediately - let it expire naturally after 5 minutes
    // This allows multiple downloads of different file types from the same session
    
    // Return the CSV content with appropriate headers
    return new Response(csvContent, {
        headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="${filename}"`
        }
    });
}
