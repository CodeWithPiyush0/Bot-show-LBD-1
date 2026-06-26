// QA export — download the comment list as a CSV "bug sheet".
//
// Reusable across projects: columns come from the generic comment shape and the
// filename uses APP_NAME, so dropping this folder into another game just works.
//
// Columns: #, Screen, Status, Comment, Author, Created, Type, Reply To, Won't-Fix Reason.
// Every row (comment OR reply) gets a sequential #; replies carry their parent's #
// in "Reply To" so threads can be reconstructed from the sheet.

import { APP_NAME } from './qa-supabase.js';

const STATUS_LABEL = {
    open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', wontfix: "Won't Fix",
};
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// "19 Jun 14:32" (viewer's local timezone)
function fmtDateTime(ts) {
    const d = new Date(ts);
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Escape one cell for CSV: wrap in quotes (doubling any inner quotes) only when it
// contains a comma, quote, or newline — so the file stays clean for simple values.
function csvCell(v) {
    const s = (v == null ? '' : String(v));
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

const COLUMNS = ['#', 'Screen', 'Status', 'Comment', 'Author', 'Created', 'Type', 'Reply To', "Won't-Fix Reason"];

// Build the CSV text from the comment list.
export function buildCsv(comments) {
    // Chronological order = stable, readable, keeps each reply after its parent's row.
    const rows = comments.slice().sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    // Assign a sequential # to every row, and map id -> # for the "Reply To" column.
    const numById = new Map();
    rows.forEach((c, i) => numById.set(c.id, i + 1));

    const lines = [COLUMNS.map(csvCell).join(',')];
    rows.forEach((c, i) => {
        const status = c.status || 'open';
        const isReply = !!c.parentId;
        lines.push([
            i + 1,
            c.screen || '',
            STATUS_LABEL[status] || status,
            c.text || '',
            c.author || '',
            c.createdAt ? fmtDateTime(c.createdAt) : '',
            isReply ? 'Reply' : 'Comment',
            isReply ? (numById.get(c.parentId) || '') : '',
            status === 'wontfix' ? (c.wontfixReason || '') : '',
        ].map(csvCell).join(','));
    });
    return lines.join('\r\n');
}

function todayStamp() {
    const d = new Date();
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Build the CSV and trigger a browser download. Returns the number of rows exported.
export function exportCommentsToCsv(comments) {
    const csv = buildCsv(comments);
    // Prepend a UTF-8 BOM (U+FEFF) so Excel reads em-dashes / accents / emoji correctly.
    const BOM = String.fromCharCode(0xFEFF);
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qa-comments_${APP_NAME}_${todayStamp()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return comments.length;
}
