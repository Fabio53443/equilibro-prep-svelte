import { error } from '@sveltejs/kit';
import { getData } from '$lib/storage.js';
import archiver from 'archiver';
import { Readable } from 'stream';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
    const { id } = params;
    
    // Extract the unique ID from the filename
    // Format: equilibro_files_12345678.zip -> 12345678
    const uniqueId = id.replace('equilibro_files_', '').replace('.zip', '');
    
    console.log('Download zip request - id:', id, 'uniqueId:', uniqueId);
    
    try {
        // Retrieve the stored data
        const sessionData = getData(uniqueId);
        
        console.log('SessionData found:', !!sessionData);
        
        if (!sessionData) {
            console.log('No session data found for uniqueId:', uniqueId);
            throw error(404, 'File non trovato o scaduto');
        }
        
        // Create a Promise that resolves when the archive is ready
        const createZip = () => {
            return new Promise((resolve, reject) => {
                const archive = archiver('zip', {
                    zlib: { level: 9 }
                });
                
                const chunks = [];
                
                archive.on('data', (chunk) => {
                    chunks.push(chunk);
                });
                
                archive.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    console.log('Zip created successfully, size:', buffer.length, 'bytes');
                    resolve(buffer);
                });
                
                archive.on('error', (err) => {
                    console.error('Archive error:', err);
                    reject(err);
                });
                
                // Add files to the archive
                console.log('Adding files to archive...');
                archive.append(sessionData.output1, { name: `CercaListe_${uniqueId}.csv` });
                archive.append(sessionData.output2, { name: `ListeLibri_${uniqueId}.csv` });
                archive.append(sessionData.schoolTerritory, { name: `ScuoleTerritorio_${uniqueId}.csv` });
                
                // Finalize the archive
                console.log('Finalizing archive...');
                archive.finalize();
            });
        };
        
        const zipBuffer = await createZip();
        
        console.log('Sending zip response, buffer size:', zipBuffer.length);
        
        return new Response(zipBuffer, {
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="equilibro_files_${uniqueId}.zip"`,
                'Content-Length': zipBuffer.length.toString()
            }
        });
        
    } catch (err) {
        console.error('Errore nel download del file zip:', err);
        throw error(500, 'Errore interno del server');
    }
}
