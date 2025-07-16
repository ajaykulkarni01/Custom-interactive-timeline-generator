import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import TimelineJS from './TimelineJS';

// Helper to normalize YouTube URLs for TimelineJS
function normalizeYouTubeUrl(url) {
  if (!url) return url;
  // Convert youtu.be short links to full links
  const shortMatch = url.match(/^https?:\/\/youtu\.be\/([\w-]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/watch?v=${shortMatch[1]}`;
  }
  // Convert embed links to watch links
  const embedMatch = url.match(/youtube\.com\/embed\/([\w-]+)/);
  if (embedMatch) {
    return `https://www.youtube.com/watch?v=${embedMatch[1]}`;
  }
  // Already in correct format
  if (url.includes('youtube.com/watch')) return url;
  return url;
}

// Helper to parse time string into hour, minute, second
function parseTime(timeStr) {
  if (!timeStr) return {};
  const [hour, minute, second] = timeStr.split(':').map(Number);
  return {
    hour: !isNaN(hour) ? hour : undefined,
    minute: !isNaN(minute) ? minute : undefined,
    second: !isNaN(second) ? second : undefined,
  };
}

// Helper to keep only TimelineJS-allowed fields in date objects
function cleanDateObj(dateObj) {
  // Recursively unwrap .data until we get a plain object
  while (dateObj && typeof dateObj === 'object' && dateObj.data) {
    dateObj = dateObj.data;
  }
  if (!dateObj) return undefined;
  const allowed = ['year', 'month', 'day', 'hour', 'minute', 'second'];
  const cleaned = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(dateObj, key) && typeof dateObj[key] !== 'undefined') {
      cleaned[key] = dateObj[key];
    }
  }
  // Deep clone to remove any prototype chain
  return JSON.parse(JSON.stringify(cleaned));
}

// Helper to robustly extract year from Excel value
function getYear(val) {
  if (!val) return undefined;
  if (typeof val === 'number') {
    // Excel serial date? Try to convert
    if (val > 1000 && val < 10000) return val; // already a year
    // else, treat as Excel date serial
    if (window.XLSX && XLSX.SSF && XLSX.SSF.parse_date_code) {
      const date = XLSX.SSF.parse_date_code(val);
      if (date && date.y) return date.y;
    }
    return undefined;
  }
  if (typeof val === 'string') {
    // Try to extract year from string
    const m = val.match(/\d{4}/);
    if (m) return Number(m[0]);
  }
  return undefined;
}

// Helper to convert Excel row to TimelineJS event
function excelRowToTimelineEvent(row) {
  const startTime = parseTime(row['Time']);
  const endTime = parseTime(row['End Time']);
  // Date object
  const startDate = cleanDateObj({
    year: getYear(row['Year']),
    month: row['Month'] && !isNaN(Number(row['Month'])) ? Number(row['Month']) : undefined,
    day: row['Day'] && !isNaN(Number(row['Day'])) ? Number(row['Day']) : undefined,
    ...startTime,
  });
  const endDate = (row['End Year'] || row['End Month'] || row['End Day'] || row['End Time']) ? cleanDateObj({
    year: getYear(row['End Year']),
    month: row['End Month'] && !isNaN(Number(row['End Month'])) ? Number(row['End Month']) : undefined,
    day: row['End Day'] && !isNaN(Number(row['End Day'])) ? Number(row['End Day']) : undefined,
    ...endTime,
  }) : undefined;

  // Media object
  const media = row['Media'] ? {
    url: normalizeYouTubeUrl(row['Media']),
    credit: row['Media Credit'] || '',
    caption: row['Media Caption'] || '',
    thumbnail: row['Media Thumbnail'] || '',
  } : undefined;

  return {
    start_date: startDate,
    end_date: endDate,
    text: {
      headline: row['Headline'] || '',
      text: row['Text'] || '',
    },
    media: media,
    group: row['Group'] || undefined,
    background: row['Background'] ? { color: row['Background'] } : undefined,
    display_date: row['Display Date'] || undefined,
    type: row['Type'] || undefined,
  };
}

function generateStandaloneHTML(timelineData) {
  // TimelineJS CDN links
  const css = 'https://cdn.knightlab.com/libs/timeline3/latest/css/timeline.css';
  const js = 'https://cdn.knightlab.com/libs/timeline3/latest/js/timeline.js';
  // HTML template
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Interactive Timeline</title>
  <link rel="stylesheet" href="${css}">
  <style>
    body { margin: 0; padding: 0; background: #f8f8f8; }
    #timeline-embed { width: 100%; height: 800px; margin: 0 auto; }
  </style>
</head>
<body>
  <div id="timeline-embed"></div>
  <script id="timeline-data" type="application/json">
${JSON.stringify(timelineData, null, 2)}
  </script>
  <script src="${js}"></script>
  <script>
    window.onload = function() {
      var timelineData = JSON.parse(document.getElementById('timeline-data').textContent);
      console.log('timelineData:', timelineData);
      window.timeline = new TL.Timeline('timeline-embed', timelineData, { height: '650', width: '100%' });
    };
  </script>
</body>
</html>`;
}

// Utility to recursively flatten objects and remove .data and prototype chains
function toPlainObject(obj) {
  if (Array.isArray(obj)) {
    return obj.map(toPlainObject);
  } else if (obj && typeof obj === 'object') {
    // Recursively unwrap .data
    while (obj && typeof obj === 'object' && obj.data) {
      obj = obj.data;
    }
    const plain = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        plain[key] = toPlainObject(obj[key]);
      }
    }
    return plain;
  }
  return obj;
}

function TimelineUploader({ fancyButton }) {
  const [timelineData, setTimelineData] = useState(null);
  const fileInputRef = React.useRef();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      // Convert to TimelineJS JSON format
      const eventsWithReasons = data.map((row, idx) => {
        const raw = excelRowToTimelineEvent(row);
        // Rebuild the event object with only plain objects for start_date and end_date
        const ev = {
          ...raw,
          start_date: cleanDateObj(raw.start_date),
          end_date: cleanDateObj(raw.end_date)
        };
        const year = ev.start_date && ev.start_date.year;
        if (typeof year !== 'number' || isNaN(year) || year <= 0) {
          console.warn(`Skipping event at row ${idx + 2} (Excel row): Invalid or missing year:`, row);
          return null;
        }
        return ev;
      });
      const events = eventsWithReasons.filter(Boolean);
      // Optionally, set a title slide (first row with type 'title' or just the first row)
      let titleSlide = events.find(ev => ev.type === 'title') || {
        text: { headline: 'Timeline', text: 'Generated from Excel' },
      };
      setTimelineData({
        title: titleSlide,
        events: events.filter(ev => ev.type !== 'title'),
      });
    };
    reader.readAsBinaryString(file);
  };

  const handleDownload = () => {
    if (!timelineData) return;
    // Flatten timelineData to plain objects before export
    const plainTimelineData = toPlainObject(timelineData);
    console.log('Exporting plainTimelineData:', plainTimelineData);
    if (plainTimelineData.events && plainTimelineData.events.length > 0) {
      console.log('Final start_date for first event:', plainTimelineData.events[0].start_date);
    }
    const html = generateStandaloneHTML(plainTimelineData);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timeline.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {fancyButton ? (
        <div className="fancy-upload-wrapper">
          <input
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />
          <button
            className="fancy-upload-btn"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            📁 Choose Excel File
          </button>
        </div>
      ) : (
        <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} style={{ marginBottom: 30 }} />
      )}
      {timelineData && (
        <>
          <TimelineJS data={timelineData} />
          <div style={{ textAlign: 'center', margin: '2rem 0' }}>
            <button className="fancy-upload-btn" onClick={handleDownload}>
              ⬇️ Download HTML
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default TimelineUploader; 