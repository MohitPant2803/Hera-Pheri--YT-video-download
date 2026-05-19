import React, { useState, useEffect } from 'react';

// Helper function to extract YouTube ID from a full URL
const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
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

const LOADING_PHRASES = [
  "ANDAR SETTING CHAL RAHI HAI...",
  "SOURCE SE BAAT HO RAHI HAI...",
  "LINE PE RAHO...",
  "ARRANGEMENT ALMOST HO GAYA...",
  "25 SECOND MEIN KAAM HO JAYEGA...",
  "RAJU HANDLE KAR RAHA HAI..."
];

export default function VideoDownloader() {
  const [url, setUrl] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_PHRASES[0]);
  const [selectedQuality, setSelectedQuality] = useState('');
  const [errorText, setErrorText] = useState("");
  const [isInputError, setIsInputError] = useState(false);
  const [isValidLink, setIsValidLink] = useState(false);
  const [showPhase2, setShowPhase2] = useState(false);

  // Clipboard Paste Helper
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text);
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  // Rotating Loading Text Effect
  useEffect(() => {
    let interval;
    if (loading) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % LOADING_PHRASES.length;
        setLoadingText(LOADING_PHRASES[i]);
      }, 2500); // Rotate every 2.5 seconds
    } else {
      setLoadingText(LOADING_PHRASES[0]);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Real-time Validation for cinematic interactions
  const validateUrl = (testUrl) => {
    const validId = getYouTubeId(testUrl);
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (testUrl.trim() && ytRegex.test(testUrl) && validId) {
      setIsValidLink(true);
    } else {
      setIsValidLink(false);
    }
  };

  // Phase 2 comedic dialogue delay
  useEffect(() => {
    let timeout;
    if (isValidLink) {
      // Pause before delivering the punchline
      timeout = setTimeout(() => setShowPhase2(true), 1200); 
    } else {
      setShowPhase2(false);
    }
    return () => clearTimeout(timeout);
  }, [isValidLink]);

  const handleFetchVideo = async (e) => {
    if (e) e.preventDefault();
    
    setVideoData(null);

    if (!url.trim()) {
      setIsInputError(true);
      setErrorText("INKE HAATH MEIN SONE KA KATORA DO, PHIR BHI BHEEKH MANGENGE! LINK DAAL!");
      return;
    }
    
    const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/;
    if (!ytRegex.test(url)) {
      setIsInputError(true);
      setUrl(''); 
      setErrorText("MAIN YAHAN KYA MACCHI BECHNE BAITHA HOON? YOUTUBE LINK DAAL!");
      return;
    }

    const videoId = getYouTubeId(url);
    if (!videoId) {
      setIsInputError(true);
      setUrl('');
      setErrorText("MAIN YAHAN KYA MACCHI CHETA BAITHA HOON? YOUTUBE LINK DAAL!");
      return;
    }

    setIsInputError(false);
    setLoading(true);
    
    try {
      const API_HOST = import.meta.env.VITE_RAPIDAPI_HOST;
      const API_KEY = import.meta.env.VITE_RAPIDAPI_KEY;

      if (!API_HOST || !API_KEY) {
        throw new Error("Missing API Credentials. Please check your .env file.");
      }

      const requestUrl = `https://${API_HOST}/v2/video/details?videoId=${videoId}&urlAccess=normal&videos=auto&audios=auto`;

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': API_KEY,
          'X-RapidAPI-Host': API_HOST
        }
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const data = await response.json();
      
      if (data?.videos?.items) {
        data.videos.items.sort((a, b) => (parseInt(b.quality) || 0) - (parseInt(a.quality) || 0));
        setSelectedQuality(data.videos.items[0].url);
      }

      setVideoData(data);
    } catch (err) {
      console.error("Fetch failed:", err);
      setIsInputError(true);
      setErrorText("API ERROR: THODA WAIT KAR LE BHAI!");
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateDownload = () => {
    triggerPhysicalDownload(selectedQuality, videoData?.title);
  };

  const selectedVideoObj = videoData?.videos?.items?.find(v => v.url === selectedQuality);
  const sizeDisplay = formatSize(selectedVideoObj?.sizeText || selectedVideoObj?.size || selectedVideoObj?.contentLength) || '79.6MB';

  return (
    <div className="w-full min-h-screen wall-texture text-amber-100 flex flex-col justify-between items-center p-4 md:p-6 pb-32 md:pb-28 select-none overflow-x-hidden font-sans relative">
      
      {/* GLOBAL BOLLYWOOD COLOR GRADING */}
      <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-transparent via-[rgba(43,16,0,0.05)] to-[rgba(18,5,0,0.8)] z-50 transform-gpu"></div>
      <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-50 transform-gpu"></div>

      {/* GLOBAL CINEMATIC TEXTURES */}
      <div className="film-grain"></div>
      <div className="scanlines"></div>
      <div className="scratches"></div>
      <div className="smoke-overlay"></div>
      
      {/* CINEMATIC HANGING LAMP LIGHTING */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_-10%,transparent_0%,rgba(0,0,0,0.88)_65%,rgba(0,0,0,0.99)_100%)] z-0 transform-gpu"></div>
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[90vw] md:w-[60vw] h-[50vh] bg-[radial-gradient(circle,rgba(212,175,55,0.1)_0%,transparent_70%)] pointer-events-none z-0 transform-gpu"></div>

      {/* BACKGROUND STORYTELLING: FADED POSTERS */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-10 transform-gpu">
        {/* Baburao Poster */}
        <div className="absolute top-[5%] left-[2%] w-72 h-[30rem] border-[12px] border-black/80 bg-[#1a1a1a] -rotate-3 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(0,0,0,1)]">
           <div className="text-9xl mb-6 grayscale filter contrast-200">👓</div>
           <div className="font-black text-5xl text-black bollywood-text tracking-tighter opacity-80">BABURAO</div>
        </div>
        {/* Raju Poster */}
        <div className="absolute top-[25%] right-[3%] w-64 h-[25rem] border-8 border-black/60 bg-[#222] rotate-6 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(0,0,0,1)]">
           <div className="text-8xl mb-4 grayscale filter contrast-200">👔</div>
           <div className="font-black text-4xl text-black bollywood-text tracking-widest opacity-80">RAJU</div>
        </div>
        {/* Shyam Poster */}
        <div className="absolute -bottom-[5%] left-[25%] w-80 h-[25rem] border-[10px] border-black/70 bg-[#151515] -rotate-12 flex flex-col items-center justify-start pt-10 shadow-[0_0_90px_rgba(0,0,0,1)]">
           <div className="text-8xl mb-4 grayscale filter contrast-200">🧑🏽‍🦱</div>
           <div className="font-black text-5xl text-black bollywood-text tracking-widest opacity-80">SHYAM</div>
        </div>
      </div>

      {/* LEFT SIDE PROPS (DESKTOP) */}
      <div className="hidden xl:flex fixed left-0 top-0 bottom-0 w-80 pointer-events-none z-10 flex-col justify-between p-8 transform-gpu">
        {/* Hanging Wires - Cinematic Foreground Blur */}
        <svg className="absolute top-0 left-12 w-24 h-[60vh] opacity-30 drop-shadow-xl z-50" preserveAspectRatio="none">
           <path d="M10,0 C30,100 -20,250 20,400 C40,550 0,700 10,800" stroke="#0a0a0a" strokeWidth="6" fill="none"/>
           <path d="M30,0 C10,150 40,300 10,450" stroke="#111" strokeWidth="4" fill="none"/>
        </svg>

        {/* CRT Wrapper - Environment & Desk */}
        <div className="relative mt-24">
           {/* Ambient Wall Glow Behind Monitor */}
           <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,rgba(74,246,38,0.03)_0%,transparent_70%)] animate-pulse pointer-events-none z-0"></div>
           
           {/* Dirty Desk Surface */}
           <div className="absolute -bottom-6 -left-12 w-[140%] h-12 bg-gradient-to-b from-[#1a120c] to-[#0a0705] border-t-[3px] border-[#3a271d] shadow-[0_15px_30px_rgba(0,0,0,0.95)] z-10 skew-x-[-12deg] pointer-events-auto">
              {/* Desk Scratches & Chai Stain */}
              <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' fill=\'%23000\'/%3E%3C/svg%3E")'}}></div>
              <div className="absolute top-2 right-6 w-8 h-4 rounded-[100%] border-2 border-black/60 bg-[#2b170a]/30 rotate-12"></div>
           </div>

           {/* Cigarette Smoke Rising */}
           <div className="absolute -bottom-8 left-0 w-24 h-40 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_0%,transparent_60%)] animate-[driftSmoke_10s_infinite_ease-in-out] pointer-events-none z-30 opacity-50"></div>

           {/* System Terminal - Ultra Realistic CRT */}
           <div className="crt-frame relative pointer-events-auto max-w-[260px] transform hover:rotate-1 transition-transform duration-500 cursor-crosshair z-20 drop-shadow-[0_20px_25px_rgba(0,0,0,0.9)]">
             {/* Sticky Note */}
             <div className="absolute -right-3 top-8 bg-yellow-200/90 text-zinc-900 p-2 text-[7px] font-black font-sans rotate-[12deg] shadow-[2px_4px_8px_rgba(0,0,0,0.7)] border-t border-l border-yellow-100 z-50 uppercase tracking-tighter">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-2 bg-red-600/40 rotate-6 shadow-sm"></div>
                Kabira Number<br/><span className="text-red-700">DO NOT LIFT</span><br/>Cross Conn.
             </div>

             <div className="absolute inset-0 pointer-events-none opacity-30" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.15\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' fill=\'%238b4513\'/%3E%3C/svg%3E")'}}></div>
             <div className="absolute inset-0 pointer-events-none border-[3px] border-white/5 rounded-lg opacity-20"></div>
             
             {/* Old Buttons & Knobs */}
             <div className="absolute bottom-2 left-4 flex gap-3 z-30">
               <div className="w-4 h-1 bg-zinc-800 border-b border-zinc-500/30 rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></div>
               <div className="w-4 h-1 bg-zinc-800 border-b border-zinc-500/30 rounded-sm shadow-[0_2px_4px_rgba(0,0,0,0.8)]"></div>
             </div>

             <div className="absolute top-2 left-3 flex gap-2 z-20 opacity-80">
                <div className="w-2.5 h-2.5 rounded-full bg-red-900 border border-black shadow-[inset_0_1px_2px_rgba(0,0,0,0.8)]"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 border border-black shadow-[0_0_8px_rgba(0,255,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.6)] animate-pulse"></div>
             </div>
             
             <div className="crt-screen-container m-3 mt-6 mb-8 relative z-10">
                {/* Realistic Screen Imperfections */}
                <div className="absolute inset-0 tube-light-glare"></div>
                <div className="absolute inset-0 glass-scratch"></div>
                <div className="burn-in-text">SYNDICATE</div>
                
                {/* Dead Pixels */}
                <div className="absolute top-[20%] left-[45%] w-[1px] h-[1px] bg-black z-40 opacity-90"></div>
                <div className="absolute top-[65%] right-[25%] w-[1.5px] h-[1.5px] bg-black z-40 opacity-80"></div>
                <div className="absolute bottom-[15%] left-[10%] w-[1px] h-[1px] bg-red-900 z-40 opacity-60"></div>

                <div className="crt-scanline-bar"></div>
                <div className="crt-dirt"></div>
                
                <div className="crt-screen font-mono text-[11px] leading-tight">
                   <div className="text-[9px] text-green-700/80 mb-2 border-b border-green-900/50 pb-1 crt-text uppercase tracking-widest flex justify-between">
                      <span>MEDIA_RECOVERY_UNIT.exe</span>
                      <span className="animate-[pulse_2s_infinite]">MEM: 64K</span>
                   </div>
                   <div className="animate-crt-flicker space-y-2 mt-2">
                      {/* DYNAMIC SOURCE STATUS */}
                      <p className={`crt-text ${!isValidLink && 'animate-crt'}`}>
                         <span className="opacity-60">[02:13:40]</span> {'>'} SOURCE... {isValidLink ? <span className="text-green-300 drop-shadow-[0_0_5px_rgba(74,246,38,1)]">CONFIRMED ✔</span> : <span className="animate-pulse opacity-70">AWAITING</span>}
                      </p>

                      <p className="crt-text"><span className="opacity-60">[02:14:03]</span> {'>'} RAJU SETTING LAGA RAHA <span className="ml-1 text-green-300 drop-shadow-[0_0_5px_rgba(74,246,38,1)]">[✔]</span></p>
                      <p className="crt-text"><span className="opacity-60">[02:14:18]</span> {'>'} SHYAM PAISA KA JUGAAD... <span className="ml-1 inline-block animate-[spin_3s_linear_infinite] text-green-400">⟳</span></p>
                      <p className="crt-text animate-crt"><span className="opacity-60">[02:14:45]</span> {'>'} BABURAO TENSION NA LE... <span className="ml-1 animate-pulse">[OK]</span></p>
                      <div className="crt-text-red font-bold mt-3 text-[11px] border-t border-red-900/50 pt-2 bg-red-950/20 shadow-[0_0_10px_rgba(255,0,0,0.1)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_2px,rgba(255,0,0,0.05)_2px,rgba(255,0,0,0.05)_4px)]"></div>
                        <p className="animate-pulse flex items-center gap-1 relative z-10"><span className="text-[12px]">⚠</span> {'>'} ERR: INTERNET DHOKA DE RAHA HAI</p>
                        <p className="text-[9px] mt-1 opacity-90 relative z-10"><span className="opacity-70">[02:15:12]</span> {'>'} POLICE STATION KE PAAS NETWORK... UNSTABLE</p>
                      </div>
                      <p className="crt-text mt-1"><span className="opacity-60">[SYS]</span> _<span className="animate-pulse inline-block w-1.5 h-2.5 bg-green-500 translate-y-0.5 ml-0.5"></span></p>
                   </div>
                </div>
             </div>
             
             {/* Frame branding */}
             <div className="absolute bottom-1.5 right-4 text-[6px] font-sans font-black text-zinc-500/50 uppercase tracking-widest drop-shadow-sm flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-zinc-600/50"></div>
                ★ JAHAN SETTING, WAHAN HUM ★
             </div>
           </div>
        </div>

        {/* Old Telephone */}
        <div className="relative mt-auto mb-16 ml-4 opacity-[0.35] drop-shadow-[2px_10px_10px_rgba(0,0,0,1)] rotate-[-12deg] group hover:opacity-80 transition-opacity grayscale-[0.5]">
           <div className="text-8xl filter sepia contrast-[1.5]">☎️</div>
           <div className="absolute -bottom-2 right-0 text-[10px] bg-[#e3d2a6] text-black font-bold px-1 rotate-12 border border-black shadow-sm">KABIRA</div>
        </div>
      </div>
      
      {/* RIGHT SIDE PROPS (DESKTOP) */}
      <div className="hidden xl:flex fixed right-0 top-0 bottom-0 w-80 pointer-events-none z-10 flex-col items-end p-8 gap-8 transform-gpu">
        {/* Warning Notice */}
        <div className="paper-texture text-red-950 p-4 w-52 rotate-3 shadow-[4px_4px_10px_rgba(0,0,0,0.8)] pointer-events-auto border border-red-900/30 mt-10">
           <div className="absolute top-[-8px] left-1/2 -translate-x-1/2 w-6 h-6 bg-amber-600 rounded-full opacity-90 shadow-md flex items-center justify-center text-[10px]">📌</div>
           <div className="font-black text-lg border-b-2 border-red-900/50 pb-1 mb-2 text-center uppercase tracking-tighter">Warning!</div>
           <div className="text-[11px] font-bold leading-tight font-mono space-y-2">
              <p>1. BILKUL RIKS NAHI DENE KA.</p>
              <p>2. NO OUTSIDE CHAI ALLOWED.</p>
              <p>3. RENT: 3 MONTHS PENDING.</p>
           </div>
        </div>

        {/* Polaroid Missing Sign */}
        <div className="bg-[#e4dcc7] p-2 pb-8 w-36 shadow-[5px_10px_20px_rgba(0,0,0,0.9)] rotate-[-6deg] filter sepia-[0.4] pointer-events-auto border border-zinc-400/50 mt-auto mb-20 relative hover:rotate-0 transition-transform">
           <div className="absolute top-[-10px] right-2 w-8 h-4 bg-[#d0c6a8] shadow-sm rotate-12 opacity-80"></div> {/* Tape */}
           <div className="w-full aspect-square bg-[#111] flex items-center justify-center overflow-hidden border border-zinc-500/50 shadow-inner">
             <div className="text-5xl opacity-40 grayscale">🤦‍♂️</div>
           </div>
           <div className="text-center text-[10px] font-black text-zinc-800 mt-2 -rotate-2 uppercase tracking-widest border-b border-zinc-400 inline-block w-full">DO NOT CALL</div>
        </div>
      </div>

      {/* 1. HEADER SECTION */}
      <header className="w-full max-w-4xl text-center mt-8 md:mt-12 mb-4 flex-shrink-0 relative z-30 flex flex-col items-center">
        
        {/* FAKE COMPANY SEALS & LABELS */}
        <div className="hidden md:block absolute top-0 left-2 md:-left-8 border-4 border-red-700 text-red-700 font-black text-[10px] md:text-sm px-2 py-1 -rotate-[15deg] tracking-[0.3em] uppercase rounded-sm shadow-sm z-40 opacity-90 pointer-events-none">
          CONFIDENTIAL
        </div>
        <div className="hidden md:block absolute top-2 right-2 md:-right-8 border border-zinc-500/50 text-zinc-500/80 font-bold text-[8px] md:text-[10px] px-2 py-0.5 rotate-[8deg] tracking-widest uppercase font-mono bg-black/60 z-40 pointer-events-none">
          MEDIA RECOVERY UNIT
        </div>

        <div className="border-y-2 border-amber-600/50 px-6 py-1 bg-[#1a1405]/90 text-[10px] md:text-xs font-black tracking-[0.4em] text-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.15)] uppercase mb-3 md:mb-5 relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px]">★</span>
          Authorized Arrangement Partner
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px]">★</span>
        </div>

        {/* MAIN CINEMATIC TITLE */}
        <div className="relative w-full flex justify-center mt-2 mb-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(202,138,4,0.15)_0%,transparent_70%)] -z-10"></div>
          <h1 className="text-7xl md:text-[150px] leading-[0.85] font-black tracking-tighter uppercase bollywood-title relative z-10 scale-y-110 px-4">
            Hera Pheri
          </h1>
        </div>

        {/* CINEMATIC SUBTITLES */}
        <div className="bg-red-800 text-white font-black text-sm md:text-3xl px-4 py-1.5 md:px-8 md:py-2 border-4 border-black shadow-[6px_6px_0_#000] -rotate-2 transform hover:rotate-1 transition-transform tracking-wider uppercase z-20 mt-3 md:mt-8 cursor-default">
          Ye Baburao ka style hai...
        </div>

        <div className="bg-black/80 border-2 border-zinc-800 px-4 py-2 mt-6 shadow-[0_4px_15px_rgba(0,0,0,0.8)] relative overflow-hidden">
           <div className="absolute inset-0 warning-stripes opacity-10"></div>
           <p className="text-xs md:text-lg font-black text-amber-400 tracking-[0.15em] uppercase relative z-10 drop-shadow-md">
             Video Link Bhejo, 25 Sec Mein Video Download!
           </p>
        </div>

        <div className="flex flex-col items-center mt-5 gap-1.5 opacity-80">
          <div className="flex items-center justify-center gap-3 w-full">
            <div className="h-[2px] w-8 md:w-16 bg-zinc-700"></div>
            <p className="text-[9px] md:text-[11px] font-black text-zinc-400 tracking-[0.25em] uppercase text-center">
              International Media Recovery Services Pvt. Ltd.
            </p>
            <div className="h-[2px] w-8 md:w-16 bg-zinc-700"></div>
          </div>
          <p className="text-[8px] md:text-[10px] font-mono text-zinc-500 tracking-[0.3em] uppercase">
            Professional Arrangements Since 2000
          </p>
        </div>
      </header>

      {/* 2. CORE CENTRAL CONTAINER */}
      <main className="w-full max-w-2xl flex-1 flex flex-col justify-center items-center my-8 z-30 relative">
        
        {/* CASE FILE CONTAINER */}
        <div className="w-full bg-[#1c1812] border-[6px] border-zinc-900 rounded-sm shadow-[0_30px_60px_rgba(0,0,0,0.95)] flex flex-col relative group z-40 transform transition-transform duration-700 hover:scale-[1.01]">
          
          {/* CORNER ACCENTS */}
          <div className="absolute -top-3 -left-3 w-6 h-6 border-t-4 border-l-4 border-amber-500 z-50 pointer-events-none"></div>
          <div className="absolute -bottom-3 -right-3 w-6 h-6 border-b-4 border-r-4 border-amber-500 z-50 pointer-events-none"></div>

          {/* CAUTION TAPE HEADER */}
          <div className="h-6 w-full warning-stripes border-b-[6px] border-zinc-900 relative">
            <div className="absolute top-0 right-4 h-full bg-black px-4 flex items-center border-x-2 border-zinc-900">
               <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shadow-[0_0_10px_red]"></div>
               <span className="text-[10px] text-red-500 font-black ml-2 tracking-widest uppercase">REC</span>
            </div>
          </div>
          
          <div className="p-6 md:p-8 flex flex-col gap-6">
          
          {/* THE CONTROL FORM ROW */}
          <form onSubmit={handleFetchVideo} className="flex flex-col w-full flex-shrink-0 bg-black/40 p-4 md:p-6 border-2 border-zinc-800 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative gap-4">
            <div className="flex flex-col md:flex-row gap-4 w-full items-stretch md:items-center">
              <div className="relative flex-1 group/input">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUrl(val);
                    validateUrl(val);
                    if (isInputError) {
                      setIsInputError(false);
                      setErrorText("");
                    }
                  }}
                  placeholder="MAAL KIDHAR HAI 👀"
                  className={`cinematic-input w-full py-5 px-3 md:px-6 pr-[75px] md:pr-[100px] border-2 text-[clamp(12px,3vw,18px)] leading-tight font-black outline-none tracking-wide transition-all duration-500 focus:scale-[1.01] placeholder:uppercase placeholder:text-[11px] sm:placeholder:text-[13px] md:placeholder:text-base placeholder:text-zinc-600/80 ${
                    isInputError
                      ? 'border-red-600 text-red-500 bg-red-950/20 focus:border-red-500 animate-shake'
                      : isValidLink
                        ? 'cinematic-input-valid text-amber-400'
                        : 'border-zinc-700 text-amber-500 focus:border-amber-500 focus:shadow-[0_0_20px_rgba(245,158,11,0.15),inset_0_4px_20px_rgba(0,0,0,1)]'
                  }`}
                />
                
                {/* COMEDIC SUCCESS DIALOGUE (STICKY NOTE) */}
                {isValidLink && !isInputError && (
                  <div className="absolute -bottom-16 md:-bottom-20 left-4 md:left-8 z-50 animate-dialogue origin-top-left pointer-events-none">
                    <div className="bg-[#fef08a] border-l-[6px] border-[#eab308] p-3 md:p-4 shadow-[4px_8px_20px_rgba(0,0,0,0.7),inset_0_0_20px_rgba(234,179,8,0.2)] text-[clamp(12px,2.5vw,16px)] flex flex-col font-bold tracking-wide">
                      <div className="text-zinc-800 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">"Link hai toh...</div>
                      <div className={`text-red-700 font-black mt-1 transition-all duration-500 ${showPhase2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}> kya kuch nahi ho sakta 😁"</div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 text-[10px] md:text-sm font-black uppercase text-black bg-amber-500 hover:bg-amber-400 px-3 md:px-5 py-2.5 md:py-3 rounded-sm transition-all border-2 border-black shadow-[2px_2px_0_#000] hover:mt-[1px] hover:shadow-[1px_1px_0_#000] active:mt-[2px] active:shadow-none"
                  title="Paste from clipboard"
                >
                  Paste
                </button>
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="cinematic-btn bg-gradient-to-b from-red-600 via-red-700 to-red-900 text-white font-black text-sm md:text-base px-6 py-4 rounded-sm shadow-[0_6px_0_rgb(69,10,10),0_10px_15px_rgba(0,0,0,0.6)] active:translate-y-[6px] active:shadow-[0_0_0_rgb(69,10,10)] transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_6px_0_rgb(69,10,10)] uppercase tracking-[0.15em] border-[3px] border-black relative overflow-hidden group/btn flex-shrink-0 w-full md:w-auto"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none"></div>
                <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Setting Lagao</span>
              </button>
            </div>
            
            {isInputError && errorText && (
              <div className="w-full bg-red-950 border-2 border-red-700 text-red-500 font-black tracking-[0.1em] text-xs md:text-sm uppercase p-3 text-center shadow-[0_0_15px_rgba(220,38,38,0.3)] animate-shake relative overflow-hidden mt-1">
                <div className="absolute inset-0 warning-stripes opacity-10"></div>
                <span className="relative z-10 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">⚠️ {errorText}</span>
              </div>
            )}
          </form>

          {/* RENDERING WRAPPER LAYER */}
          <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[260px] relative">
            {loading && (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 relative overflow-hidden bg-[#050505] border-2 border-zinc-800 shadow-[inset_0_0_40px_rgba(0,0,0,1)]">
                {/* Fake Cinematic Rotating Fan Shadows */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] aspect-square opacity-10 pointer-events-none">
                  <div className="w-full h-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(0,0,0,1)_45deg,transparent_90deg,transparent_180deg,rgba(0,0,0,1)_225deg,transparent_270deg)] animate-fan rounded-full"></div>
                </div>
                
                {/* Fake Server Activity Rack */}
                <div className="flex gap-4 mb-8 bg-black p-3 border-2 border-zinc-900 rounded-sm z-10 shadow-lg">
                   <div className="flex flex-col gap-2 items-center">
                     <div className="w-4 h-4 rounded-full bg-red-600 animate-pulse shadow-[0_0_15px_red]"></div>
                     <span className="text-[8px] text-zinc-500 font-mono">PWR</span>
                   </div>
                   <div className="flex flex-col gap-2 items-center">
                     <div className="w-4 h-4 rounded-full bg-amber-500 animate-[crtBlink_0.5s_infinite] shadow-[0_0_10px_orange]"></div>
                     <span className="text-[8px] text-zinc-500 font-mono">NET</span>
                   </div>
                   <div className="flex flex-col gap-2 items-center">
                     <div className="w-4 h-4 rounded-full bg-green-500 animate-[crtBlink_0.2s_infinite] shadow-[0_0_15px_green]"></div>
                     <span className="text-[8px] text-zinc-500 font-mono">DAT</span>
                   </div>
                </div>

                <div className="bg-black/80 border border-amber-900/50 p-4 md:p-6 relative z-10 w-full text-center shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                   <div className="text-[10px] text-amber-600/70 mb-2 font-mono tracking-widest uppercase animate-crt">Establishing Secure Arrangement...</div>
                   <p className="text-amber-400 font-black tracking-widest uppercase text-base md:text-xl transition-all duration-500">{loadingText}</p>
                </div>
              </div>
            )}

            {!loading && !videoData && (
              <div className="w-full h-full border-2 border-dashed border-zinc-700/80 bg-black/20 p-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
                <div className="absolute -right-8 -bottom-8 text-9xl opacity-10 rotate-12 grayscale">😭</div>
                <div className="text-6xl mb-2 drop-shadow-lg filter grayscale animate-memeFloat">🤦‍♂️</div>
                <div>
                  <p className="text-lg md:text-xl font-black tracking-widest text-zinc-400 uppercase">System khaali baitha hai 😭</p>
                  <p className="text-sm font-bold text-zinc-600 mt-1 uppercase">Abhi tak koi arrangement nahi hua.</p>
                </div>
                <div className="border border-red-900 text-red-700 bg-red-950/30 text-[10px] px-2 py-1 uppercase font-black tracking-widest mt-2">
                  Rule No.1 — Bilkul Riks Nahi Lene Ka.
                </div>
              </div>
            )}

            {!loading && videoData && (
              <div className="w-full flex flex-col gap-5 items-center animate-slideUp bg-[#e3d5b8] text-zinc-900 border-x-[12px] border-b-[12px] border-[#222] p-4 md:p-6 rounded-b-sm shadow-[inset_0_20px_30px_rgba(0,0,0,0.8)] relative mt-4">
                
                {/* FAKE FOLDER TABS & LABELS */}
                <div className="absolute -top-10 left-0 bg-[#e3d5b8] text-black text-[10px] md:text-xs font-black px-6 py-2 uppercase tracking-widest border-t-[8px] border-x-[8px] border-[#222] rounded-t-lg shadow-[inset_0_10px_10px_rgba(255,255,255,0.4)] z-0">
                  CONFIDENTIAL CASE FILE
                </div>
                
                {/* RECOVERED STAMP */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl md:text-6xl evidence-stamp -rotate-[25deg] z-20 pointer-events-none opacity-50">
                  RECOVERED
                </div>

                <h2 className="w-full text-center text-xl md:text-3xl font-black uppercase tracking-tighter border-b-4 border-zinc-800/20 pb-4 mb-2 text-[#111] drop-shadow-sm">Recovered Media File</h2>

                {/* Left Side: Thumbnail */}
                <div className="w-full relative z-10 p-2 bg-[#d1c2a3] border border-zinc-400 shadow-inner">
                  <div className="relative rounded-sm overflow-hidden border-2 border-black shadow-[0_4px_15px_rgba(0,0,0,0.8)] group aspect-video bg-black">
                    <img
                      src={videoData?.thumbnail || videoData?.video?.thumbnail || `https://i.ytimg.com/vi_webp/${videoData?.id}/maxresdefault.webp`}
                      alt={`${videoData?.title || 'Recovered Video'} thumbnail`}
                      fetchPriority="high"
                      decoding="async"
                      loading="eager"
                      onError={(e) => { 
                        e.target.onerror = null; // Prevents infinite loop if fallback also fails
                        e.target.src = `https://img.youtube.com/vi/${videoData?.id}/hqdefault.jpg`; 
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-80 group-hover:opacity-100 grayscale-[0.3] group-hover:grayscale-0"
                    />
                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.9)] pointer-events-none"></div>
                    <span className="absolute bottom-2 right-2 bg-amber-500 text-black border border-black px-2 py-0.5 text-xs font-black tracking-widest">
                      {formatDuration(videoData?.lengthSeconds || videoData?.duration || videoData?.video?.lengthSeconds)}
                    </span>
                  </div>
                </div>

                {/* Right Side: Operations */}
                <div className="w-full flex flex-col gap-5 relative z-10">
                  <div className="bg-black/5 p-3 border-l-4 border-red-700 shadow-sm">
                     <h3 className="text-sm md:text-lg font-black text-black line-clamp-2 uppercase tracking-tighter leading-tight">{videoData?.title}</h3>
                  </div>

                  <div className="flex flex-col gap-2 text-xs">
                    <label className="font-black text-zinc-800 tracking-widest uppercase bg-zinc-300 inline-block w-fit px-2 py-1 shadow-sm border border-zinc-400">KITNA QUALITY CHAHIYE?</label>
                    <div className="flex flex-wrap gap-2">
                      {videoData?.videos?.items?.length > 0 ? videoData.videos.items.map((video, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedQuality(video.url)}
                          className={`tape-button px-4 py-3 font-black text-[11px] md:text-xs uppercase tracking-wider rounded-sm border-2 border-black transition-all active:translate-y-[4px] active:shadow-none ${
                            selectedQuality === video.url 
                              ? 'bg-red-600 text-white' 
                              : 'bg-[#b8a98a] text-black hover:bg-[#a69777]'
                          }`}
                        >
                          {video.quality}
                        </button>
                      )) : (
                        <span className="text-red-700 font-black">NO QUALITY OPTIONS FOUND</span>
                      )}
                    </div>
                  </div>

                  {selectedQuality && (
                    <div className="w-full bg-yellow-400 border-[4px] border-black p-4 text-center my-2 relative overflow-hidden shadow-[4px_4px_0_#000]">
                      <div className="absolute inset-0 warning-stripes opacity-20"></div>
                      <p className="text-black font-black text-base md:text-xl tracking-tighter uppercase relative z-10 drop-shadow-[0_2px_2px_rgba(255,255,255,0.8)]">
                        <span className="text-red-700 text-2xl md:text-3xl border-b-4 border-red-700/30">{sizeDisplay}</span> LAGENGE... BOL BAAT PAKKI KARUN??
                      </p>
                    </div>
                  )}

                  <button 
                    onClick={handleInitiateDownload}
                    disabled={!selectedQuality}
                    className="cinematic-btn w-full bg-gradient-to-b from-zinc-200 to-zinc-400 hover:to-zinc-300 text-black border-[6px] border-black font-black tracking-widest py-5 shadow-[0_8px_0_#000,0_15px_20px_rgba(0,0,0,0.5)] active:translate-y-[8px] active:shadow-none transition-all text-lg md:text-xl uppercase disabled:opacity-50 disabled:active:translate-y-0 disabled:active:shadow-[0_8px_0_#000] relative overflow-hidden group/dl mt-2"
                  >
                     <span className="relative z-10 drop-shadow-[0_2px_0_rgba(255,255,255,0.8)]">KHOPDI TOD SAALE KA! (DOWNLOAD)</span>
                  </button>
                </div>

              </div>
            )}
          </div>

          </div>
        </div>
      </main>

      {/* 3. FOOTER SIGNATURE BAR */}
      <footer className="w-full text-center flex flex-col items-center justify-center flex-shrink-0 relative z-30 mb-10 md:mb-4 pb-6">
        <div className="relative inline-block px-8 py-3 bg-[#110a05] border-4 border-[#3e2312] shadow-[0_15px_25px_rgba(0,0,0,0.9),inset_0_0_20px_rgba(0,0,0,0.8)] transform -rotate-2 group pointer-events-auto mt-4">
           {/* Dusty Scratches on the signboard */}
           <div className="absolute inset-0 pointer-events-none opacity-40" style={{backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' fill=\'%238b4513\'/%3E%3C/svg%3E")'}}></div>
           <div className="absolute inset-0 pointer-events-none glass-scratch opacity-60"></div>
           
           {/* Tube light glow effect text */}
           <div className="text-xl md:text-2xl font-black mohit-signboard signboard-flicker relative z-10 tracking-[0.2em] uppercase">
              A Mohit Productions
           </div>
           
           {/* Hanging wires */}
           <div className="absolute -top-8 left-4 w-1.5 h-8 bg-gradient-to-r from-zinc-900 to-zinc-600 shadow-[2px_2px_5px_rgba(0,0,0,0.8)]"></div>
           <div className="absolute -top-10 right-6 w-1.5 h-10 bg-gradient-to-r from-zinc-900 to-zinc-600 shadow-[2px_2px_5px_rgba(0,0,0,0.8)]"></div>
        </div>
      </footer>
      
      {/* BOTTOM DESK EDGE & PROPS */}
      <div className="fixed bottom-0 left-0 right-0 h-24 md:h-32 pointer-events-none z-20 flex justify-between items-end px-4 md:px-16 overflow-hidden transform-gpu">
         <div className="absolute inset-0 bg-gradient-to-t from-[#0a0502] via-[#1a0f05]/95 to-transparent border-t-2 border-[#3e2723]/40 shadow-[0_-15px_40px_rgba(0,0,0,0.9)]"></div>
         
         {/* Approval Stamp */}
         <div className="relative z-30 mb-6 md:mb-10 ml-2 md:ml-20 text-red-700/80 font-black text-2xl md:text-4xl border-[4px] border-red-700/80 px-3 py-1 md:px-4 md:py-2 -rotate-[15deg] rounded-sm bollywood-text tracking-[0.2em] pointer-events-auto">
            ARRANGED
         </div>

         {/* Chai Glass (Hidden on very small mobile screens) */}
         <div className="hidden sm:block relative z-30 mb-2 mr-10 md:mr-32 opacity-80 drop-shadow-[0_15px_15px_rgba(0,0,0,1)] grayscale-[0.3] hover:opacity-100 hover:grayscale-0 transition-all pointer-events-auto cursor-pointer">
            <div className="text-6xl md:text-7xl filter sepia contrast-150 grayscale-[0.2]">☕</div>
            {/* Fake Chai Stains on Desk */}
            <div className="absolute -bottom-1 -left-2 w-16 h-8 border-b-4 border-[#3e2723]/60 rounded-[100%] rotate-12 bg-transparent shadow-sm"></div>
            <div className="absolute -bottom-3 -right-2 w-12 h-6 border-b-[3px] border-[#3e2723]/40 rounded-[100%] -rotate-12 bg-transparent"></div>
         </div>
      </div>

    </div>
  );
}