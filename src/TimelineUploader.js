import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import TimelineJS from './TimelineJS';

// Helper to convert Excel row to TimelineJS event
function excelRowToTimelineEvent(row) {
  // Date object
  const startDate = {
    year: row['Year'] ? String(row['Year']) : undefined,
    month: row['Month'] ? String(row['Month']) : undefined,
    day: row['Day'] ? String(row['Day']) : undefined,
    time: row['Time'] ? String(row['Time']) : undefined,
  };
  const endDate = (row['End Year'] || row['End Month'] || row['End Day'] || row['End Time']) ? {
    year: row['End Year'] ? String(row['End Year']) : undefined,
    month: row['End Month'] ? String(row['End Month']) : undefined,
    day: row['End Day'] ? String(row['End Day']) : undefined,
    time: row['End Time'] ? String(row['End Time']) : undefined,
  } : undefined;

  // Media object
  const media = row['Media'] ? {
    url: row['Media'],
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

function TimelineUploader({ fancyButton, onTimelineReady }) {
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
      const events = data.map(excelRowToTimelineEvent);
      // Optionally, set a title slide (first row with type 'title' or just the first row)
      let titleSlide = events.find(ev => ev.type === 'title') || {
        text: { headline: 'Timeline', text: 'Generated from Excel' },
      };
      const timelineData = {
        title: titleSlide,
        events: events.filter(ev => ev.type !== 'title'),
      };
      setTimelineData(timelineData);
      if (onTimelineReady) {
        onTimelineReady(timelineData);
      }
    };
    reader.readAsBinaryString(file);
  };

  if (onTimelineReady) {
    // Only show upload UI, don't render TimelineJS here
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
      </div>
    );
  }

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
      {timelineData && <TimelineJS data={timelineData} />}
    </div>
  );
}

export default TimelineUploader; 