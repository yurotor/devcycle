#!/bin/bash
# Clear all ticket-related data from the DB and KB transcripts.
# Preserves: workspace, PATs, repos, scan jobs, suggestions, interview notes, KB wiki/raw analysis.

DB="devcycle.db"

if [ ! -f "$DB" ]; then
  echo "No database found at $DB — nothing to clear."
  exit 0
fi

echo "Clearing tickets, tasks, waves, chat messages, review comments, and implement jobs..."
node -e "
const Database = require('better-sqlite3');
const db = new Database('$DB');
db.exec('DELETE FROM chat_messages');
db.exec('DELETE FROM review_comments');
db.exec('DELETE FROM tasks');
db.exec('DELETE FROM waves');
db.exec('DELETE FROM tickets');
db.exec(\"DELETE FROM jobs WHERE type = 'implement'\");
console.log('DB cleared.');
db.close();
"

echo "Clearing ticket transcripts from KB..."
rm -rf ../kb/raw/transcripts/*/
rm -rf ../kb/wiki/tickets/*/

echo "Done. Workspace, repos, scan data, and KB wiki are preserved."
