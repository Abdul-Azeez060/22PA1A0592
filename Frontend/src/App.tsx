import React, { useState } from 'react';
import { Copy, QrCode, Link, BarChart3, Calendar, MousePointer, ExternalLink, AlertCircle, CheckCircle, CornerDownRight } from 'lucide-react';
import './App.css';

const API_BASE = 'http://localhost:4000';

type NotificationType = 'success' | 'error' | '';

interface Notification {
  message: string;
  type: NotificationType;
}

interface ClickDetail {
  timestamp: string;
  referrer: string | null;
  ip: string;
}

interface UrlStats {
  shortcode: string;
  originalUrl: string;
  createdAt: string;
  expiry: string;
  totalClicks: number;
  clickDetails: ClickDetail[];
}

interface ShortenedUrl {
  shortcode: string;
  originalUrl: string;
  shortLink: string;
  expiry: string;
  createdAt: string;
  clicks: number;
  stats?: UrlStats;
}

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shorten' | 'stats'>('shorten');
  const [url, setUrl] = useState<string>('');
  const [customShortcode, setCustomShortcode] = useState<string>('');
  const [validity, setValidity] = useState<string>('');
  const [shortenedUrls, setShortenedUrls] = useState<ShortenedUrl[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<Notification>({ message: '', type: '' });
  const [latestShort, setLatestShort] = useState<ShortenedUrl | null>(null);

  const showNotification = (message: string, type: NotificationType) => {
    setNotification({ message, type });
    setTimeout(() => setNotification({ message: '', type: '' }), 3000);
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const validateInputs = (): boolean => {
    if (!url.trim()) {
      showNotification('Please enter a URL', 'error');
      return false;
    }
    if (!validateUrl(url)) {
      showNotification('Please enter a valid URL', 'error');
      return false;
    }
    if (customShortcode && !/^[a-zA-Z0-9]{4,}$/.test(customShortcode)) {
      showNotification('Custom shortcode must be alphanumeric and at least 4 characters', 'error');
      return false;
    }
    if (validity && (!Number.isInteger(Number(validity)) || Number(validity) < 1)) {
      showNotification('Validity must be a positive integer (minutes)', 'error');
      return false;
    }
    return true;
  };

  const handleShortenUrl = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const payload: { url: string; shortcode?: string; validity?: number } = { url };
      payload.shortcode = "qxRMwq"
      if (customShortcode) payload.shortcode = customShortcode;
      if (validity) payload.validity = Number(validity);

      const response = await fetch(`${API_BASE}/shorturls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        const shortcode = data.shortLink.split('/').pop();
        const newUrl: ShortenedUrl = {
          shortcode,
          originalUrl: url,
          shortLink: data.shortLink,
          expiry: data.expiry,
          createdAt: new Date().toISOString(),
          clicks: 0
        };

        setShortenedUrls(prev => [newUrl, ...prev]);
        setLatestShort(newUrl);
        setUrl('');
        setCustomShortcode('');
        setValidity('');
        showNotification('URL shortened successfully!', 'success');
      } else {
        showNotification(data.error || 'Failed to shorten URL', 'error');
      }
    } catch (error) {
      showNotification('Network error. Please try again.', 'error');
    }
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Copied to clipboard!', 'success');
    });
  };

  const fetchStats = async (shortcode: string) => {
    try {
      const response = await fetch(`${API_BASE}/shorturls/${shortcode}/stats`);
      const data: UrlStats = await response.json();

      if (response.ok) {
        setShortenedUrls(prev => prev.map(url =>
          url.shortcode === shortcode
            ? { ...url, stats: data, clicks: data.totalClicks }
            : url
        ));
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const isExpired = (expiryString: string) => {
    return new Date(expiryString) < new Date();
  };

  return (
    <div className="app-bg">
  
      {notification.message && (
        <div className={`notification ${notification.type}`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}

      <div className="container">
      
        <div className="header">
          <h1>URL Shortener</h1>
          <p>Shorten your URLs and track analytics</p>
        </div>

      
        <div className="tab-nav">
          <button
            onClick={() => setActiveTab('shorten')}
            className={activeTab === 'shorten' ? 'tab active' : 'tab'}
          >
            <Link className="icon" size={16} />
            Shorten URL
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={activeTab === 'stats' ? 'tab active' : 'tab'}
          >
            <BarChart3 className="icon" size={16} />
            Statistics
          </button>
        </div>

        {activeTab === 'shorten' && (
          <div className="card">
            
            <div className="form-group">
              <label>Paste Your Link</label>
              <div className="input-row">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/very-long-url"
                  className="input"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleShortenUrl();
                  }}
                />
                <button
                  onClick={handleShortenUrl}
                  disabled={loading}
                  className="btn-primary"
                  aria-label="Shorten URL"
                >
                  {loading ? (
                    <div className="spinner" />
                  ) : (
                    <CornerDownRight size={20} />
                  )}
                </button>
              </div>
            </div>

            {/* Optional Settings */}
            <div className="form-row">
              <div className="form-group">
                <label>Custom Shortcode (Optional)</label>
                <input
                  type="text"
                  value={customShortcode}
                  onChange={(e) => setCustomShortcode(e.target.value)}
                  placeholder="mycode123"
                  className="input"
                />
              </div>
              <div className="form-group">
                <label>Validity Period (Minutes)</label>
                <input
                  type="number"
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  placeholder="30"
                  min="1"
                  className="input"
                />
              </div>
            </div>

            
            {latestShort && (
              <div className="short-url-highlight">
                <span className="short-url-label">Shortened URL:</span>
                <a
                  href={latestShort.shortLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="short-url-link"
                >
                  {latestShort.shortLink}
                </a>
                <button
                  className="copy-btn"
                  onClick={() => copyToClipboard(latestShort.shortLink)}
                  aria-label="Copy shortened URL"
                >
                  <Copy size={18} />
                </button>
              </div>
            )}

 
            {shortenedUrls.length > 0 && (
              <div>
                <h3>Recent URLs</h3>
                {shortenedUrls.slice(0, 5).map((item, index) => (
                  <div key={index} className="recent-url">
                    <div className="recent-url-row">
                      <div className="recent-url-info">
                        <span className="shortcode">{item.shortcode}</span>
                        <span className="original-url">{item.originalUrl}</span>
                      </div>
                      <div className="recent-url-actions">
                        <button
                          onClick={() => copyToClipboard(item.shortLink)}
                          className="icon-btn"
                          title="Copy link"
                        >
                          <Copy size={16} />
                        </button>
                        
                        <a
                          href={item.shortLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="icon-btn"
                          title="Open link"
                        >
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                    <div className="recent-url-meta">
                      <span>
                        <MousePointer size={14} />
                        {item.clicks} clicks
                      </span>
                      <span>
                        <Calendar size={14} />
                        Expires: {formatDate(item.expiry)}
                      </span>
                      {isExpired(item.expiry) && (
                        <span className="expired">EXPIRED</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

  
            
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="card stats-section">
            <h2 className="stats-title">URL Statistics</h2>
            {shortenedUrls.length === 0 ? (
              <div className="empty-stats">
                <BarChart3 size={48} />
                <p>No URLs shortened yet</p>
                <button
                  onClick={() => setActiveTab('shorten')}
                  className="btn-primary"
                >
                  Shorten Your First URL
                </button>
              </div>
            ) : (
              <div className="stats-list">
                {shortenedUrls.map((item, index) => (
                  <div key={index} className="stats-card">
                    <div className="stats-card-header">
                      <div className="stats-link-block">
                        <a href={item.shortLink} target="_blank" rel="noopener noreferrer" className="stats-short-link">{item.shortLink}</a>
                        <span className="stats-original-url">{item.originalUrl}</span>
                      </div>
                      <button
                        onClick={() => fetchStats(item.shortcode)}
                        className="btn-primary btn-small stats-refresh-btn"
                        title="Refresh Stats"
                      >
                        Refresh
                      </button>
                    </div>
                    <div className="stats-info-row">
                      <div className="stats-info-box">
                        <span className="stats-info-label">Total Clicks</span>
                        <span className="stats-info-value">{item.clicks}</span>
                      </div>
                      <div className="stats-info-box">
                        <span className="stats-info-label">Created At</span>
                        <span className="stats-info-value">{formatDate(item.createdAt)}</span>
                      </div>
                      <div className="stats-info-box">
                        <span className="stats-info-label">Expires At</span>
                        <span className="stats-info-value">{formatDate(item.expiry)}</span>
                      </div>
                    </div>
                    {item.stats && item.stats.clickDetails && item.stats.clickDetails.length > 0 && (
                      <div className="click-details-block">
                        <h4 className="click-details-title">Click Details</h4>
                        <div className="click-details-list">
                          {item.stats.clickDetails.map((click, clickIndex) => (
                            <div key={clickIndex} className="click-detail-row">
                              <span className="click-detail-date">{formatDate(click.timestamp)}</span>
                              <span className="click-detail-ip">IP: {click.ip}</span>
                              {click.referrer && <span className="click-detail-ref">From: {click.referrer}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
