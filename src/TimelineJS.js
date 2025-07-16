import React, { useEffect, useRef } from 'react';

const TIMELINEJS_CSS = 'https://cdn.knightlab.com/libs/timeline3/latest/css/timeline.css';
const TIMELINEJS_JS = 'https://cdn.knightlab.com/libs/timeline3/latest/js/timeline.js';

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

const TimelineJS = ({ data }) => {
  const timelineRef = useRef(null);

  useEffect(() => {
    if (!data) return;
    loadCSS(TIMELINEJS_CSS);
    loadScript(TIMELINEJS_JS).then(() => {
      if (window.TL && timelineRef.current) {
        // Clear previous timeline if any
        timelineRef.current.innerHTML = '';
        window.timeline = new window.TL.Timeline(
          timelineRef.current,
          data,
          { height: '650', width: '100%' }
        );
      }
    });
  }, [data]);

  return (
    <div style={{ padding: '30px' }}>
      <div ref={timelineRef} id="timeline-embed" style={{ width: '100%', height: 800 }}></div>
    </div>
  );
};

export default TimelineJS; 