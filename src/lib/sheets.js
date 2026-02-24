import { google } from 'googleapis';

/**
 * Extract the Google Sheet ID from a full URL.
 * Handles formats like:
 *   https://docs.google.com/spreadsheets/d/SHEET_ID/edit
 *   https://docs.google.com/spreadsheets/d/SHEET_ID/
 */
export function extractSheetId(url) {
    if (!url) return null;
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url; // If no URL pattern, assume it's a raw ID
}

/**
 * Create an authenticated Google Sheets client using a service account.
 */
function getSheetsClient() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    return google.sheets({ version: 'v4', auth });
}

/**
 * Fetch all rows from the first sheet of a Google Sheet.
 * Expected columns: Name, Gender, Unique Team ID
 * Returns array of { name, gender, uniqueTeamId, rowIndex }
 */
export async function fetchSheetData(sheetId) {
    const sheets = getSheetsClient();

    // Get the sheet metadata to find the first sheet name
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const firstSheet = meta.data.sheets?.[0]?.properties?.title || 'Sheet1';

    // Get all values
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${firstSheet}`,
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return []; // No data rows (only header or empty)

    const headers = rows[0].map((h) => h.toString().trim().toLowerCase());

    // Find column indices (flexible matching)
    const nameIdx = headers.findIndex((h) =>
        h.includes('name') && !h.includes('team')
    );
    const genderIdx = headers.findIndex((h) => h.includes('gender'));
    const teamIdIdx = headers.findIndex(
        (h) => h.includes('team') || h.includes('unique') || h.includes('group')
    );

    if (nameIdx === -1) {
        throw new Error(
            'Could not find a "Name" column in the Google Sheet. ' +
            `Found headers: ${rows[0].join(', ')}`
        );
    }

    const players = [];
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const name = row[nameIdx]?.toString().trim();
        if (!name) continue; // Skip empty rows

        players.push({
            name,
            gender: genderIdx !== -1 ? row[genderIdx]?.toString().trim() || 'Unknown' : 'Unknown',
            uniqueTeamId: teamIdIdx !== -1 ? row[teamIdIdx]?.toString().trim() || null : null,
            rowIndex: i + 1, // 1-indexed (matches sheet row numbers with header)
        });
    }

    return players;
}
