import React, { useState, useEffect } from 'react';
import { Download, Youtube, Link as LinkIcon, HardDrive, PlayCircle, AlertCircle } from 'lucide-react';

const loadingDialogues = [
  "Setting ho rahi hai...",
  "Andar baat chal rahi hai.",
  "System dekh raha hoon.",
  "Source mil jayega.",
  "Ho jayega.",
  "Ek minute.",
  "Arrangement chal raha hai.",
  "Line pe hain.",
  "Kaam almost ho gaya.",
  "Kaam rukega nahi.",
  "Connection ban raha hai.",
  "Line busy hai.",
  "Aaj thoda complicated lag raha hai..."
];

const successDialogues = [
  "Mil gaya.",
  "Ho gaya kaam.",
  "Bola tha na.",
  "Bola tha na ho jayega.",
  "Source mil gaya 👀"
];

// Helper function to extract YouTube ID from a full URL
const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const formatSize = (size) => {
  if (!size) return "Thoda data";
  if (typeof size === 'string' && /[a-zA-Z]/.test(size)) return size; // Already has MB/GB from API
  const bytes = parseInt(size);
  if (isNaN(bytes)) return "Thoda data";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return (mb / 1024).toFixed(2) + " GB";
  return mb.toFixed(1) + " MB";
};

const formatDuration = (totalSeconds) => {
  if (!totalSeconds || isNaN(totalSeconds)) return "00:00";
  
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  // Pad numbers with leading zeros if they are single digits
  const paddedMins = String(mins).padStart(2, '0');
  const paddedSecs = String(secs).padStart(2, '0');

  if (hrs > 0) {
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
};

// Helper function to trigger a physical local download
const triggerPhysicalDownload = async (streamUrl, videoTitle = "download") => {
  try {
    // 1. Fetch the binary data directly from the API stream link
    const response = await fetch(streamUrl);
    
    // 2. Convert it into a browser Blob (Binary Large Object)
    const videoBlob = await response.blob();
    
    // 3. Create a temporary local object URL pointer
    const localBlobUrl = window.URL.createObjectURL(videoBlob);
    
    // 4. Dynamically generate an anchor tag and simulate a physical click
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = localBlobUrl;
    downloadAnchor.setAttribute('download', `${videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`);
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    // 5. Clean up the browser memory footprint
    downloadAnchor.parentNode.removeChild(downloadAnchor);
    window.URL.revokeObjectURL(localBlobUrl);
  } catch (error) {
    console.error("Blob download blocked or failed:", error);
    // Secure Fallback: Open in a new tab if local Blob creation fails
    window.open(streamUrl, '_blank');
  }
};

export default function VideoDownloader() {
  const [url, setUrl] = useState('');
  const [platform, setPlatform] = useState('none'); // 'none', 'youtube'
  const [status, setStatus] = useState('idle'); // 'idle', 'loading', 'success', 'error'
  const [selectedQuality, setSelectedQuality] = useState('');
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [successMsg, setSuccessMsg] = useState('');
  const [isProcessingDownload, setIsProcessingDownload] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [fetchClicks, setFetchClicks] = useState(0);
  const [easterEggMsg, setEasterEggMsg] = useState('');

  // Spam Click Easter Egg Timer
  useEffect(() => {
    if (fetchClicks >= 5) {
      setEasterEggMsg("Zor zor se bolke sabko scheme bata de.");
      setFetchClicks(0);
      setTimeout(() => setEasterEggMsg(''), 4000);
    }
    const timer = setTimeout(() => setFetchClicks(0), 1500);
    return () => clearTimeout(timer);
  }, [fetchClicks]);

  // Secret Logo Easter Egg Timer
  useEffect(() => {
    if (logoClicks >= 5) {
      setEasterEggMsg("21 din mein bandwidth double.");
      setLogoClicks(0);
      setTimeout(() => setEasterEggMsg(''), 4000);
    }
    const timer = setTimeout(() => setLogoClicks(0), 2000);
    return () => clearTimeout(timer);
  }, [logoClicks]);

  // Subtle Cinematic Thud Audio for Easter Eggs
  useEffect(() => {
    if (easterEggMsg) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(60, ctx.currentTime); // Deep bass pitch
        osc.frequency.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) { /* Ignore if AudioContext is blocked */ }
    }
  }, [easterEggMsg]);

  // Cinematic rotating dialogues timer
  useEffect(() => {
    let interval;
    if (status === 'loading') {
      interval = setInterval(() => {
        setLoadingIndex((prev) => (prev + 1) % loadingDialogues.length);
      }, 2500);
    } else {
      setLoadingIndex(0);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Automated Platform Detection via Regex
  useEffect(() => {
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

    if (ytRegex.test(url)) {
      setPlatform('youtube');
    } else {
      setPlatform('none');
    }
  }, [url]);

  const handleFetch = async (e) => {
    e.preventDefault();
    if (status === 'loading') return;
    
    setVideoData(null);
    setApiError('');
    setValidationError('');
    
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;

    // 1. Strict validation: Reject non-YouTube URLs immediately to protect API quota
    if (!ytRegex.test(url)) {
      setValidationError('Ye kaam ka link nahi hai.');
      return;
    }

    // 2. Isolate the 11-character Video ID from the sanitized string
    const videoId = getYouTubeId(url);

    if (!videoId) {
      setValidationError('YouTube wala bhejo.');
      return;
    }

    setValidationError('');
    setApiError('');
    setStatus('loading');
    
    try {
      const API_HOST = import.meta.env.VITE_RAPIDAPI_HOST;
      const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

      if (!API_HOST || !API_KEY) {
        throw new Error("Missing API Credentials. Please check your .env file.");
      }

      // Explicitly target the validated /v2/video/details endpoint path
      const requestUrl = `https://${API_HOST}/v2/video/details?videoId=${videoId}&urlAccess=normal&videos=auto&audios=auto`;

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': API_HOST
        }
      });

      // Extract the remaining requests from the response headers
      const requestsLimit = response.headers.get('x-ratelimit-requests-limit');
      const requestsRemaining = response.headers.get('x-ratelimit-requests-remaining');
      console.log(`API Plan Quota: ${requestsLimit} total requests.`);
      console.log(`API Requests Remaining: ${requestsRemaining} left!`);

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Aaj kaafi bhaag-daud ho gayi...');
        }
        throw new Error('Ye wala source cooperate nahi kar raha.');
      }

      const data = await response.json();
      console.log('API Response data:', data); // Inspect this in your browser console to see what the API returns!
      
      // Sort videos highest to lowest quality
      if (data?.videos?.items) {
        data.videos.items.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
      }

      setVideoData(data);
      
      // Automatically pre-select the first available stream download quality link
      if (data?.videos?.items?.length > 0) {
        setSelectedQuality(data.videos.items[0].url);
      }

      setStatus('success');
      
      setSuccessMsg(successDialogues[Math.floor(Math.random() * successDialogues.length)]);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (error) {
      setStatus('error');
      setApiError(error.message || 'Connection toot gaya.');
    }
  };

  const handleReset = () => {
    setUrl('');
    setStatus('idle');
    setValidationError('');
    setApiError('');
    setVideoData(null);
    setSelectedQuality('');
    setSuccessMsg('');
    setIsProcessingDownload(false);
  };

  const handleInitiateDownload = () => {
    setIsProcessingDownload(true);
    setTimeout(async () => {
      await triggerPhysicalDownload(selectedQuality, videoData?.title);
      setIsProcessingDownload(false);
    }, 2000);
  };

  const selectedVideoObj = videoData?.videos?.items?.find(v => v.url === selectedQuality);
  const sizeDisplay = formatSize(selectedVideoObj?.sizeText || selectedVideoObj?.size || selectedVideoObj?.contentLength);

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4 font-sans relative overflow-hidden text-stone-200">
      
      {/* Gritty Textures & CRT Atmosphere */}
      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none z-0"></div>
      <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none mix-blend-overlay z-0"></div>

      {/* Chaotic Tube Lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-yellow-600/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-red-900/15 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[40%] left-[60%] w-[20rem] h-[20rem] bg-emerald-900/10 rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Massive Cinematic Watermarks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex flex-col justify-between p-10 opacity-[0.02] font-black text-8xl md:text-[14rem] leading-none text-stone-100 uppercase mix-blend-overlay select-none">
        <span className="transform -rotate-12 translate-x-[-10%]">Baburao</span>
        <span className="transform rotate-6 translate-x-[20%] text-right text-stone-400">Raju</span>
        <span className="transform -rotate-6 translate-x-[-5%] text-center">Shyam</span>
      </div>

      <div className="bg-stone-900/90 backdrop-blur-md max-w-2xl w-full rounded-sm shadow-[10px_10px_0px_rgba(0,0,0,1)] border-2 border-stone-700 p-6 sm:p-10 relative z-10">
        
        {/* Hero Title Area */}
        <div className="text-center space-y-3 relative">
          <div className="absolute -top-4 -right-2 sm:-right-8 rotate-12 border-2 border-red-600 text-red-600 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-sm opacity-80 pointer-events-none tracking-widest shadow-sm">
            ILLEGAL<br/>APPROVED
          </div>
          <p className="text-stone-500 font-mono text-[10px] sm:text-xs uppercase tracking-[0.3em]">
            International Media Recovery Dept.
          </p>
          <h1 
            onClick={() => setLogoClicks(prev => prev + 1)}
            className="text-5xl sm:text-6xl font-black text-yellow-500 tracking-tighter uppercase drop-shadow-[0_0_15px_rgba(234,179,8,0.2)] cursor-pointer select-none transition-transform active:scale-95"
            style={{ textShadow: '3px 3px 0px #7f1d1d, -1px -1px 0px #1c1917' }}
          >
            Hera Pheri
          </h1>
          <p className="text-stone-400 font-medium text-sm sm:text-base italic">
            "Professional Arrangements Since 2000"
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleFetch} className="mt-10">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                {platform === 'youtube' ? (
                  <Youtube className="w-6 h-6 text-red-600 transition-all duration-300 scale-110 drop-shadow-[0_0_8px_rgba(220,38,38,0.6)]" />
                ) : (
                  <LinkIcon className="w-5 h-5 text-stone-500 transition-all duration-300" />
                )}
              </div>
              
              <input
                type="url"
                required
                placeholder="Link bhejo. Baaki hum dekh lenge..."
                className={`block w-full pl-12 pr-4 py-4 border-2 ${validationError ? 'border-red-500/50 focus:border-red-500 bg-red-950/20 text-red-200' : 'border-stone-700 focus:border-yellow-500 bg-stone-950/50 text-emerald-400 focus:ring-1 focus:ring-yellow-500/50'} rounded-none placeholder:text-stone-600 transition-all text-sm sm:text-base outline-none font-mono shadow-inner`}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (validationError) setValidationError('');
                }}
                disabled={status === 'loading'}
              />
            </div>
            
            <button
              type="submit"
              onClick={() => setFetchClicks(prev => prev + 1)}
              className={`flex items-center justify-center gap-2 bg-red-700 hover:bg-red-600 text-yellow-50 px-8 py-4 rounded-none font-bold uppercase tracking-wider border-2 border-stone-900 transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] active:translate-y-1 active:translate-x-1 active:shadow-none ${status === 'loading' ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {status === 'loading' ? (
                <div className="w-5 h-5 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              {status === 'loading' ? 'Ruko zara...' : 'Karwa Do'}
            </button>
          </div>

          {/* Validation Error Banner */}
          {validationError && (
            <div className="mt-3 text-sm text-red-400 bg-stone-950 border-l-4 border-red-600 p-3 flex items-center gap-2 animate-in slide-in-from-top-1 fade-in duration-200 shadow-[4px_4px_0px_rgba(0,0,0,0.5)]">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-mono">{validationError}</span>
            </div>
          )}
        </form>

        {/* State-Based UI Rendering */}
        <div className="mt-8 transition-all duration-500 ease-in-out">
          
          {/* Idle State */}
          {status === 'idle' && (
            <div className="text-center py-12 border-2 border-dashed border-stone-700 rounded-none bg-stone-950/30 shadow-inner">
              <p className="text-sm text-stone-500 font-mono uppercase tracking-widest">
                Khaali baitha hai system.
              </p>
            </div>
          )}

          {/* Cinematic Loading Skeleton */}
          {status === 'loading' && (
            <div className="flex flex-col gap-6 p-6 border-2 border-stone-700 rounded-none bg-stone-900/50 relative overflow-hidden shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              
              {/* Rotating Dialogue */}
              <div className="flex items-center justify-center py-2 h-10">
                <p key={loadingIndex} className="text-lg font-mono font-bold text-yellow-500 animate-in fade-in zoom-in-95 duration-700 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">
                  {loadingDialogues[loadingIndex]}
                </p>
              </div>

              <div className="animate-pulse flex flex-col sm:flex-row gap-5 opacity-50">
                <div className="w-full sm:w-48 h-32 bg-stone-800 border border-stone-700 rounded-sm flex-shrink-0"></div>
                <div className="flex-1 space-y-4 py-2 w-full">
                  <div className="space-y-2">
                    <div className="h-4 bg-stone-800 border border-stone-700 rounded-none w-4/5"></div>
                    <div className="h-4 bg-stone-800 border border-stone-700 rounded-none w-3/5"></div>
                  </div>
                  <div className="h-3 bg-stone-800 border border-stone-700 rounded-none w-1/4 mt-4"></div>
                  <div className="flex gap-2 pt-2">
                    <div className="h-10 bg-stone-800 border border-stone-700 rounded-none w-32"></div>
                    <div className="h-10 bg-stone-800 border border-stone-700 rounded-none w-32"></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Error State */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-10 px-5 border-2 border-red-900/50 rounded-none bg-stone-950/50 shadow-[4px_4px_0px_rgba(0,0,0,1)]">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <p className="text-lg text-red-200 font-bold text-center max-w-sm font-mono">
                {apiError}
              </p>
              <button
                onClick={handleReset}
                className="mt-6 px-6 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold uppercase text-sm tracking-wider rounded-none border-2 border-stone-600 transition-colors shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:translate-x-0.5 active:shadow-none"
              >
                Naya Link Do
              </button>
            </div>
          )}

          {/* Results State */}
          {status === 'success' && (
            <div className="flex flex-col sm:flex-row gap-6 p-6 border-2 border-stone-700 rounded-none bg-stone-900/60 backdrop-blur-md shadow-[8px_8px_0px_rgba(0,0,0,1)]">
              {/* Thumbnail */}
              <div className="relative w-full sm:w-56 h-36 rounded-sm overflow-hidden bg-black flex-shrink-0 group cursor-pointer border-2 border-stone-800 shadow-inner">
                <img
                  src={
                    videoData?.thumbnail || 
                    videoData?.video?.thumbnail || 
                    `https://img.youtube.com/vi/${videoData?.id || 'sL_KBnYB17I'}/maxresdefault.jpg`
                  }
                  alt="Video thumbnail"
                  className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-transform duration-700 scale-105 group-hover:scale-110"
                  onError={(e) => {
                    // Ultimate fallback if maxresdefault is blocked or missing
                    e.target.src = `https://img.youtube.com/vi/${videoData?.id}/hqdefault.jpg`;
                  }}
                />
                <PlayCircle className="absolute inset-0 m-auto text-white/90 w-12 h-12 group-hover:scale-110 transition-transform duration-500 drop-shadow-2xl" />
                <span className="absolute bottom-2 right-2 bg-black/90 text-red-500 text-xs font-bold font-mono px-2 py-1 rounded-none border border-red-900/50 shadow-sm">
                  {formatDuration(
                    videoData?.lengthSeconds || 
                    videoData?.duration || 
                    videoData?.video?.lengthSeconds
                  )}
                </span>
              </div>

              {/* Details & Actions */}
              <div className="flex flex-col justify-between flex-1">
                <div>
                  <h3 className="text-xl font-bold text-stone-100 leading-snug line-clamp-2 drop-shadow-sm" title={videoData?.title}>
                    {videoData?.title || "Video Title"}
                  </h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/50 border border-red-900/50 px-2.5 py-1 rounded-sm">
                      <Youtube className="w-3.5 h-3.5 text-red-500" />
                      YouTube
                    </span>
                    {videoData?.viewCount && <span className="text-xs text-stone-400 font-mono tracking-wide">• {videoData.viewCount} views</span>}
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm font-bold text-stone-400 mb-3 font-mono uppercase tracking-wider">Kitna quality chahiye?</p>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Quality Selector */}
                    <div className="relative w-full sm:w-auto">
                      <select
                        value={selectedQuality}
                        onChange={(e) => setSelectedQuality(e.target.value)}
                        className="w-full appearance-none bg-stone-950 border-2 border-stone-700 text-emerald-400 text-sm font-bold rounded-none pl-4 pr-10 py-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 cursor-pointer transition-colors shadow-inner"
                      >
                        {videoData?.videos?.items?.length > 0 ? (
                          videoData.videos.items.map((video, index) => (
                            <option key={index} value={video.url}>
                              {video.quality} ({video.extension || 'mp4'})
                            </option>
                          ))
                        ) : (
                          <option value={selectedQuality}>Default Quality</option>
                        )}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                    
                    {/* Download Action */}
                    <button
                      onClick={handleInitiateDownload}
                      disabled={!selectedQuality}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-emerald-50 text-sm font-bold uppercase tracking-wider px-8 py-3.5 rounded-none border-2 border-stone-900 transition-all shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <HardDrive className="w-4 h-4 drop-shadow-md" />
                      Nikaal Do
                    </button>
                  </div>

                  {selectedQuality && (
                    <p className="text-xs font-bold text-stone-400 tracking-wide mt-4 font-mono animate-in fade-in slide-in-from-bottom-1">
                      <span className="text-amber-700">{sizeDisplay}</span> lagenge... bol baat pakki karun??
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        
      </div>

      {/* Cinematic Success Toast */}
      {successMsg && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <div className="bg-stone-900 border-2 border-emerald-600 text-emerald-400 px-6 py-3 rounded-none shadow-[6px_6px_0px_rgba(0,0,0,1)] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
            <span className="font-bold tracking-wide font-mono uppercase">{successMsg}</span>
          </div>
        </div>
      )}

      {/* Cinematic Processing Overlay */}
      {isProcessingDownload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-sm animate-in fade-in duration-500">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-900/20 rounded-full blur-[80px] animate-pulse pointer-events-none"></div>
          <div className="text-center space-y-4 relative z-10">
            <div className="w-12 h-12 border-4 border-stone-800 border-t-yellow-500 rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-100 tracking-tight drop-shadow-sm font-mono uppercase">
              Andar kaam chal raha hai.
            </h2>
            <p className="text-red-400 font-bold text-lg font-mono">
              Thoda waqt lagega.
            </p>
          </div>
        </div>
      )}

      {/* Cinematic Easter Egg Alert */}
      {easterEggMsg && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-8 fade-in duration-500">
          <div className="bg-stone-900 border-2 border-red-600 text-red-400 px-8 py-4 rounded-none shadow-[8px_8px_0px_rgba(0,0,0,1)] flex flex-col items-center gap-1">
            <span className="text-stone-500 font-mono text-[10px] font-black uppercase tracking-[0.25em] opacity-80">Classified</span>
            <span className="font-bold tracking-wider text-lg whitespace-nowrap font-mono">{easterEggMsg}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center opacity-40 hover:opacity-100 transition-opacity duration-700 z-10 w-full pointer-events-none">
        <p className="text-stone-500 font-mono text-[10px] sm:text-xs font-bold uppercase tracking-[0.3em]">
          Professional arrangements department. <br className="sm:hidden" />
          <span className="hidden sm:inline"> • </span> Organized chaos since 2000.
        </p>
      </div>

    </div>
  );
}