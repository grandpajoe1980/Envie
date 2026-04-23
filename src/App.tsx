/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, 
  Mic, 
  MicOff, 
  Volume2, 
  Search, 
  ChevronRight, 
  Settings2, 
  RotateCcw, 
  CheckCircle2, 
  X,
  History,
  Info,
  ExternalLink,
  PlusCircle,
  Snail,
  Rabbit,
  AlertTriangle
} from 'lucide-react';
import { evaluatePronunciation, lookupDictionary, PronunciationResult, generateNewSentence, generateCustomSentence } from './lib/gemini';
import { STARTER_SENTENCES } from './constants';
import { Sentence, SRSState, UserStats } from './types';

const uiText = {
  'vn-to-en': {
    bilingualTrainer: "Bilingual Trainer",
    learningSession: "Learning Session",
    totalWords: "Total Words",
    currentStrategy: "Current Strategy",
    expertiseMap: "Expertise Map",
    srsMessage: "SRS Core 2.0 active. Next session scheduled. Tuning for phoneme precision.",
    translateThis: "Translate this",
    listen: "Listen",
    meaningAndPronunciation: "Meaning & Pronunciation",
    hearAudio: "Hear Audio",
    again: "Again",
    hard: "Hard",
    good: "Good",
    nextSentence: "NEXT SENTENCE",
    voiceEngine: "Voice Engine",
    listening: "Listening...",
    pressAndHold: "Tap to Speak", // Changed for tap to speak mode
    evaluatingTones: "Evaluating...",
    accuracyScore: "Accuracy Score",
    result: "Result",
    perfected: "Perfected",
    clearEngine: "Clear Engine",
    audioAnalysisReady: "Audio analysis ready for processing. Tone verification active.",
    addCustomCard: "Add Custom Card",
    searchDictionary: "Search Dictionary",
    settings: "Settings",
    vocabulary: "Vocabulary",
    grammar: "Grammar",
    common: "Common"
  },
  'en-to-vn': {
    bilingualTrainer: "Huấn luyện song ngữ",
    learningSession: "Phiên Học Tập",
    totalWords: "Tổng số từ",
    currentStrategy: "Chiến lược hiện tại",
    expertiseMap: "Bản Đồ Năng Lực",
    srsMessage: "SRS Core 2.0 đã kích hoạt. Chuẩn bị cho phiên tiếp theo. Điều chỉnh phát âm.",
    translateThis: "Dịch câu này",
    listen: "Nghe",
    meaningAndPronunciation: "Ý nghĩa & Phát âm",
    hearAudio: "Nghe Phát Âm",
    again: "Lại",
    hard: "Khó",
    good: "Tốt",
    nextSentence: "CÂU TIẾP THEO",
    voiceEngine: "Phân Tích Giọng Nói",
    listening: "Đang nghe...",
    pressAndHold: "Chạm để nói", // Changed for tap to speak mode
    evaluatingTones: "Đang đánh giá...",
    accuracyScore: "Điểm Chính Xác",
    result: "Kết Quả",
    perfected: "Hoàn Hảo",
    clearEngine: "Xóa Kết Quả",
    audioAnalysisReady: "Sẵn sàng phân tích âm thanh. Hệ thống nhận diện đang hoạt động.",
    addCustomCard: "Thêm thẻ tùy chỉnh",
    searchDictionary: "Từ điển",
    settings: "Cài đặt",
    vocabulary: "Từ vựng",
    grammar: "Ngữ pháp",
    common: "Thông dụng"
  }
};

export default function App() {
  // --- State ---
  const [sentences, setSentences] = useState<Sentence[]>(STARTER_SENTENCES);
  const [srsData, setSrsData] = useState<Record<string, SRSState>>({});
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [direction, setDirection] = useState<'vn-to-en' | 'en-to-vn'>('vn-to-en');
  const [difficulty, setDifficulty] = useState(2);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingResult, setRecordingResult] = useState<PronunciationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [dictQuery, setDictQuery] = useState('');
  const [dictResult, setDictResult] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // New States for Custom Card & Voice
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [practiceWordMode, setPracticeWordMode] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const silenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // --- Derived State ---
  const currentSentence = useMemo(() => {
    // Filter sentences by difficulty or just take the current one
    // In a real app, SRS would pick the one due for review
    return sentences[currentSentenceIndex % sentences.length];
  }, [sentences, currentSentenceIndex]);

  // --- Effects ---
  useEffect(() => {
    const savedSrs = localStorage.getItem('chime_srs');
    if (savedSrs) setSrsData(JSON.parse(savedSrs));
    
    const savedMeta = localStorage.getItem('chime_meta');
    if (savedMeta) {
      const { direction, difficulty, voiceSpeed: savedSpeed } = JSON.parse(savedMeta);
      if (direction) setDirection(direction);
      if (difficulty) setDifficulty(difficulty);
      if (savedSpeed) setVoiceSpeed(savedSpeed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('chime_srs', JSON.stringify(srsData));
    localStorage.setItem('chime_meta', JSON.stringify({ direction, difficulty, voiceSpeed }));
  }, [srsData, direction, difficulty, voiceSpeed]);

  const t = uiText[direction as 'vn-to-en' | 'en-to-vn'];
  const targetLangCode = direction === 'vn-to-en' ? 'vn' : 'en';
  const targetText = direction === 'vn-to-en' ? currentSentence.vn : currentSentence.en;
  
  const catchApiError = (err: any) => {
    console.error("API call error:", err);
    let errorMsg = String(err);
    if (err?.message) errorMsg = err.message;
  
    try { 
      if (errorMsg.includes('{"error"')) {
        const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf('{')));
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      }
    } catch(e) {}
    
    if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.toLowerCase().includes("prepayment credits are depleted")) {
      setGlobalError("The AI API quota has been exhausted or credits are depleted. Please check billing settings in AI Studio.");
    } else {
      setGlobalError(`Service Error: ${errorMsg}`);
    }
  };

  // Handlers
  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    setIsFlipped(false);
    setRecordingResult(null);
    setPracticeWordMode(null);
    
    // If we're at the end of the starter list, try to generate a new one
    if (currentSentenceIndex >= sentences.length - 1) {
      handleGenerateNew();
    } else {
      setCurrentSentenceIndex((prev) => (prev + 1));
    }
  };

  const handlePracticeWord = (word: string) => {
    setPracticeWordMode(word);
    speak(word, targetLangCode, 0.7); // pronounce slowly
    // Start recording automatically after speaking? 
    // Usually SpeechSynthesis doesn't have an easy promise unless we listen to onend.
    // Let's just have it bound to a dedicated mic button.
  };

  const handleGenerateNew = async () => {
    setIsLoading(true);
    setGlobalError(null);
    try {
      const news = await generateNewSentence(difficulty, direction);
      const id = Date.now().toString();
      const newSentence: Sentence = {
        id,
        ...news,
        difficulty,
      };
      setSentences(prev => [...prev, newSentence]);
      setCurrentSentenceIndex(sentences.length);
    } catch (err) {
      catchApiError(err);
      setCurrentSentenceIndex(0); // Loop back as fallback
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      // Silence detection setup
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      let analyser: AnalyserNode | null = null;
      let dataArray: Uint8Array | null = null;
      
      if (AudioContextClass) {
        try {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          analyser = audioCtx.createAnalyser();
          const source = audioCtx.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.minDecibels = -70;
          dataArray = new Uint8Array(analyser.frequencyBinCount);
        } catch (e) {
          console.warn("AudioContext setup failed for silence detection", e);
        }
      }

      let silenceStart = Date.now();
      let hasSpoken = false;

      if (analyser && dataArray) {
        silenceIntervalRef.current = setInterval(() => {
          if (!mediaRecorder.current || mediaRecorder.current.state !== 'recording') {
            if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
            return;
          }
          analyser!.getByteFrequencyData(dataArray!);
          const sum = dataArray!.reduce((acc, val) => acc + val, 0);
          const average = sum / dataArray!.length;

          // Threshold for speech detection - increased to 25 to ignore background static/noise
          if (average > 25) { 
            hasSpoken = true;
            silenceStart = Date.now();
          }

          const timeSinceSilence = Date.now() - silenceStart;
          // Auto stop after 2.5s silence if spoken, or 10s total if no speech
          if ((hasSpoken && timeSinceSilence > 2500) || (!hasSpoken && timeSinceSilence > 10000)) {
            stopRecording();
          }
        }, 100);
      }

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        // Essential: stop tracks only inside onstop
        if (mediaRecorder.current?.stream) {
           mediaRecorder.current.stream.getTracks().forEach(t => t.stop());
        }
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
           audioContextRef.current.close().catch(console.error);
        }
        if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);

        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        if (audioBlob.size === 0) return;

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsLoading(true);
          setGlobalError(null);
          try {
            const evalLang = direction === 'vn-to-en' ? 'vn' : 'en';
            // If in practice mode, only evaluate the specific word
            const evalText = practiceWordMode || (direction === 'vn-to-en' ? currentSentence.vn : currentSentence.en);
            
            const result = await evaluatePronunciation(
              base64Audio, 
              evalText, 
              evalLang
            );
            
            if (practiceWordMode) {
              setRecordingResult(prev => {
                if (!prev) return result;
                
                // Update the specific word in the existing breakdown
                const updatedBreakdown = prev.wordBreakdown.map(item => {
                   // Compare ignoring punctuation/case if possible, or exact match
                   if (item.word.toLowerCase() === practiceWordMode.toLowerCase()) {
                     const match = result.wordBreakdown.find(x => x.word.toLowerCase() === practiceWordMode.toLowerCase()) || result.wordBreakdown[0];
                     return match ? { ...item, score: match.score, feedback: match.feedback } : { ...item, score: result.score, feedback: result.feedback };
                   }
                   return item;
                });
                
                return {
                  ...prev,
                  wordBreakdown: updatedBreakdown
                };
              });
              setPracticeWordMode(null); // Clear mode after practice
            } else {
              setRecordingResult(result);
              updateSRS(currentSentence.id, result.score);
            }
          } catch (err) {
            catchApiError(err);
          } finally {
            setIsLoading(false);
          }
        };
      };

      mediaRecorder.current.start(200); // 200ms timeslices ensure we capture data even if stopped quickly
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.stop();
      setIsRecording(false);
      if (silenceIntervalRef.current) clearInterval(silenceIntervalRef.current);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const updateSRS = (id: string, aiScore: number) => {
    // Map AI score (0-100) to SRS score (1-5)
    let srsScore = 1;
    if (aiScore > 90) srsScore = 5;
    else if (aiScore > 80) srsScore = 4;
    else if (aiScore > 65) srsScore = 3;
    else if (aiScore > 40) srsScore = 2;

    setSrsData(prev => {
      const current = prev[id] || { 
        sentenceId: id, 
        nextReview: Date.now(), 
        interval: 0, 
        ease: 2.5, 
        history: [] 
      };

      let { interval, ease } = current;
      if (srsScore >= 3) {
        if (interval === 0) interval = 1;
        else if (interval === 1) interval = 6;
        else interval = Math.round(interval * ease);
        ease = ease + (0.1 - (5 - srsScore) * (0.08 + (5 - srsScore) * 0.02));
      } else {
        interval = 1;
        ease = Math.max(1.3, ease - 0.2);
      }
      
      const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
      return {
        ...prev,
        [id]: { ...current, interval, ease, nextReview }
      };
    });
  };

  const handleSRSRating = (index: number) => {
    // index 0 = Again (score: 20), index 1 = Hard (score: 65), index 2 = Good (score: 90)
    const scores = [20, 65, 90];
    updateSRS(currentSentence.id, scores[index]);
    handleNext();
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setIsLoading(true);
    setGlobalError(null);
    try {
      const news = await generateCustomSentence(customInput);
      const id = Date.now().toString();
      const newSentence: Sentence = {
        id,
        ...news,
        difficulty,
      };
      setSentences(prev => [...prev, newSentence]);
      setCurrentSentenceIndex(sentences.length);
      setShowCustomModal(false);
      setCustomInput('');
    } catch (err) {
      catchApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string, lang: 'vn' | 'en', rate: number = voiceSpeed) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang === 'vn' ? 'vi-VN' : 'en-US';
    utterance.rate = rate;
    window.speechSynthesis.speak(utterance);
  };

  const handleDictionarySearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!dictQuery.trim()) return;
    setIsLoading(true);
    setGlobalError(null);
    try {
      const result = await lookupDictionary(dictQuery);
      setDictResult(result);
    } catch (err) {
      catchApiError(err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render ---
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#020617] text-[#f1f5f9] selection:bg-emerald-500/20 font-sans relative">
      
      {/* Global Error Banner */}
      <AnimatePresence>
        {globalError && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] w-11/12 max-w-2xl bg-red-500/10 border-2 border-red-500 backdrop-blur-md text-red-100 rounded-2xl p-4 shadow-2xl flex items-start gap-4"
          >
            <AlertTriangle className="text-red-400 mt-1 flex-none" size={24} />
            <div className="flex-1 text-sm font-medium leading-relaxed">
              {globalError}
            </div>
            <button 
              onClick={() => setGlobalError(null)}
              className="p-1 rounded-lg hover:bg-red-500/20 transition-colors"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="flex-none flex items-center justify-between px-6 py-4 bg-[#0f172a]/50 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center font-bold text-slate-950 text-xl">
            <Languages size={24} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white serif">
              EnVie <span className="text-slate-500 font-normal text-sm italic ml-1">Learning</span>
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{t.bilingualTrainer}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {/* Language Swap - Matching design pattern */}
          <div className="hidden lg:flex items-center bg-slate-800 rounded-full p-1 border border-slate-700">
            <button 
              onClick={() => setDirection('vn-to-en')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${direction === 'vn-to-en' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              VN → EN
            </button>
            <button 
              onClick={() => setDirection('en-to-vn')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${direction === 'en-to-vn' ? 'bg-emerald-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
              EN → VN
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowCustomModal(true)}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
              title={t.addCustomCard}
            >
              <PlusCircle size={20} />
            </button>
            <button 
              onClick={() => setShowDictionary(!showDictionary)}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
               title={t.searchDictionary}
            >
              <Search size={20} />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
              title={t.settings}
            >
              <Settings2 size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with 3-column layout pattern */}
      <main className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto grid grid-cols-1 overflow-y-auto lg:overflow-hidden lg:grid-cols-[240px_minmax(0,1fr)_280px] gap-6 p-6">
        
        {/* Left Column: Stats & Progress */}
        <aside className="hidden lg:flex flex-col gap-6 min-h-0">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 shadow-sm flex-none">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-4">{t.learningSession}</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-medium text-slate-400">{t.totalWords}</span>
                  <span className="text-emerald-400 font-mono text-sm">{Object.keys(srsData).length}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, Object.keys(srsData).length * 10)}%` }}
                    className="h-full bg-emerald-500" 
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-tighter">{t.currentStrategy}</span>
                <span className="text-lg font-serif italic text-white capitalize">{
                  currentSentence.category === 'vocabulary' ? t.vocabulary : 
                  currentSentence.category === 'grammar' ? t.grammar :
                  currentSentence.category === 'common' ? t.common : 
                  currentSentence.category
                }</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-6 flex-1 min-h-0 overflow-y-auto hidden-scrollbar">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-6">{t.expertiseMap}</h3>
            <div className="grid grid-cols-4 gap-2">
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-8 rounded-md border ${
                    i < Object.keys(srsData).length 
                      ? 'bg-emerald-500/20 border-emerald-500/40 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]' 
                      : 'bg-slate-800 border-slate-700/50'
                  }`} 
                />
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-6 leading-relaxed font-bold uppercase tracking-tight">{t.srsMessage}</p>
          </div>
        </aside>

        {/* Center Column: Flashcard & Main Actions */}
        <div className="flex flex-col gap-6 min-h-[60vh] lg:min-h-0">
          {/* Flashcard Area */}
          <div className="relative flex-1 min-h-[350px] lg:min-h-0 perspective-1000">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSentence.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 1.05, y: -10 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="w-full h-full"
              >
                <div 
                  className={`flashcard-inner relative w-full h-full cursor-pointer group ${isFlipped ? 'flip-vertical' : ''}`}
                  onClick={handleFlip}
                >
                  {/* Front Side */}
                  <div className="flashcard-side absolute inset-0 bg-[#0f172a] rounded-[40px] p-8 lg:p-12 border border-slate-800 shadow-2xl flex flex-col items-center justify-center text-center overflow-hidden">
                    {/* Decorative element from design */}
                    <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none text-white">
                      <svg width="160" height="160" viewBox="0 0 100 100" fill="white">
                        <path d="M10,10 L90,10 L90,90 L10,90 Z" fill="none" stroke="currentColor" strokeWidth="0.5"/>
                      </svg>
                    </div>

                    <span className="px-4 py-1.5 bg-slate-800 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-8 lg:mb-12 border border-slate-700">{t.translateThis}</span>
                    <h3 className="text-3xl lg:text-4xl xl:text-5xl serif leading-tight text-white mb-8">
                      {targetText}
                    </h3>
                    <div className="mt-4 lg:mt-8 flex space-x-4 items-center">
                       <button 
                        onClick={(e) => { e.stopPropagation(); speak(targetText, targetLangCode); }}
                        className="px-6 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-all flex items-center gap-2 group"
                       >
                         <Volume2 size={20} className="group-hover:scale-110 transition-transform" />
                         <span className="text-sm font-bold uppercase tracking-wider">{t.listen}</span>
                       </button>
                    </div>
                  </div>

                  {/* Back Side */}
                  <div className="flashcard-side absolute inset-0 bg-slate-100 rounded-[40px] p-8 lg:p-12 text-slate-950 shadow-2xl flip-vertical flex flex-col items-center justify-center text-center overflow-hidden">
                    <span className="px-4 py-1.5 bg-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 lg:mb-8">{t.meaningAndPronunciation}</span>
                    <h3 className="text-2xl lg:text-3xl xl:text-4xl serif leading-tight text-slate-900 font-medium mb-3">
                       {direction === 'vn-to-en' ? currentSentence.en : currentSentence.vn}
                    </h3>

                    {/* Word-by-word translation */}
                    {currentSentence.literal_translation && (
                      <div className="flex flex-wrap justify-center gap-x-2 gap-y-1 mb-6 max-w-full text-xs lg:text-sm text-slate-500">
                        {currentSentence.literal_translation.map((wt, i) => (
                           <span key={i} className="inline-flex rounded-lg px-2 py-1 items-center bg-white border border-slate-200 shadow-sm">
                             <span className="font-semibold text-slate-700 mr-1">{wt.word}</span>
                             <span className="opacity-40 mx-1">=</span>
                             <span className="italic">{wt.translation}</span>
                           </span>
                        ))}
                      </div>
                    )}

                    <div className="w-16 h-1 bg-emerald-500 rounded-full mb-4" />
                    <p className="text-lg lg:text-xl xl:text-2xl text-emerald-600 italic mono mb-6 lg:mb-8">
                      {direction === 'vn-to-en' ? currentSentence.pronunciation : (currentSentence.en_pronunciation || currentSentence.en)}
                    </p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); speak(targetText, targetLangCode); }}
                      className="px-8 py-3 rounded-xl bg-[#0f172a] text-white hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      <Volume2 size={20} />
                      <span className="text-sm font-bold uppercase tracking-wider">{t.hearAudio}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="flex-none flex justify-center items-center bg-[#0f172a] border border-slate-800 p-2 lg:p-3 rounded-2xl lg:rounded-3xl gap-1.5 lg:gap-2 w-full overflow-x-auto hidden-scrollbar">
            {/* Mic Icon */}
            <button 
                onClick={toggleRecording}
                className={`flex-none px-3 lg:px-5 h-[42px] lg:h-[48px] rounded-xl flex items-center justify-center transition-all border ${
                  isRecording 
                    ? 'bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] text-red-500' 
                    : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
                }`}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* SRS Ratings */}
            <div className="flex flex-1 gap-1.5 lg:gap-2">
              {['Again', 'Hard', 'Good'].map((label, idx) => (
                <button 
                  key={label}
                  onClick={() => handleSRSRating(idx)}
                  className="flex-1 h-[42px] lg:h-[48px] px-2 border border-slate-700 rounded-xl text-[10px] lg:text-xs font-bold text-slate-400 hover:bg-slate-800 hover:text-white transition-all uppercase tracking-widest flex items-center justify-center"
                >
                  <span className="truncate">{label === 'Again' ? t.again : label === 'Hard' ? t.hard : t.good}</span>
                  <span className="ml-1.5 text-[9px] opacity-40 font-mono italic hidden lg:block">{['1m', '2d', '4d'][idx]}</span>
                </button>
              ))}
            </div>

            {/* Next Arrow */}
            <button 
              onClick={handleNext}
              className="flex-none px-3 lg:px-5 h-[42px] lg:h-[48px] bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center"
              title={t.nextSentence}
            >
              <ChevronRight size={22} strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Right Column: Voice Analysis Engine */}
        <aside className={`flex-col gap-6 min-h-[350px] lg:min-h-0 ${isRecording || isLoading || recordingResult ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 lg:p-6 flex-1 flex flex-col min-h-0 shadow-sm relative overflow-y-auto hidden-scrollbar">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-widest mb-4 lg:mb-10 flex-none hidden lg:block">{t.voiceEngine}</h3>
            
            <div className="flex-1 flex flex-col items-center justify-center gap-4 lg:gap-8 min-h-0">
              {isLoading ? (
                <div className="text-center py-2 lg:py-6 flex-1">
                   <div className="w-8 h-8 lg:w-10 lg:h-10 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin mx-auto mb-2 lg:mb-4" />
                   <p className="text-[10px] lg:text-sm font-serif italic text-slate-500">{t.evaluatingTones}</p>
                </div>
              ) : recordingResult ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full space-y-4 lg:space-y-6 flex-1 overflow-y-auto hidden-scrollbar"
                >
                  <div className="text-center mt-0 lg:mt-2">
                    <div className="text-3xl lg:text-6xl font-black text-emerald-400 leading-none mono">
                      {recordingResult.score}
                    </div>
                    <p className="text-[9px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest mt-1 lg:mt-2">{t.accuracyScore}</p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-3 lg:p-4 bg-[#020617] rounded-xl border border-slate-800">
                      <p className="text-[9px] lg:text-xs leading-relaxed text-slate-400 italic">{recordingResult.feedback}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {recordingResult.wordBreakdown.map((item, i) => (
                        <div 
                          key={i} 
                          onClick={() => handlePracticeWord(item.word)}
                          className={`p-3 lg:p-4 bg-[#020617] rounded-xl border flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors ${practiceWordMode === item.word ? 'border-emerald-500' : 'border-slate-800'}`}
                        >
                          <div className={`flex-none w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-xs lg:text-sm ${item.score > 80 ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'}`}>
                            {item.score}%
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-200 mb-1">{item.word}</p>
                            <p className="text-[10px] lg:text-xs text-slate-400 leading-relaxed italic">{item.feedback || 'Good formulation.'}</p>
                          </div>
                          
                          {/* Practice Mic Button */}
                          <div className="flex-none flex items-center">
                             {practiceWordMode === item.word ? (
                               <button 
                                  onClick={(e) => { e.stopPropagation(); toggleRecording(); }}
                                  className={`p-2 lg:p-3 rounded-full border transition-all ${
                                    isRecording 
                                      ? 'bg-red-500 text-white border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' 
                                      : 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500 hover:text-white'
                                  }`}
                                  title={`Practice '${item.word}'`}
                               >
                                  {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                               </button>
                             ) : (
                               <button 
                                  className="p-2 lg:p-3 rounded-full border border-slate-700 bg-slate-800 text-slate-500"
                               >
                                 <Volume2 size={16} />
                               </button>
                             )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="flex-1 hidden lg:flex flex-col justify-center items-center opacity-30 text-center gap-4">
                  <Mic size={32} className="text-slate-500" />
                  <p className="text-sm font-serif italic max-w-[160px] mx-auto text-slate-500 tracking-tight">{t.audioAnalysisReady}</p>
                </div>
              )}
            </div>

            {/* Clear button - removed for mobile space */}
          </div>
        </aside>
      </main>

      {/* Dictionary Modal - Dark Mode */}
      <AnimatePresence>
        {showDictionary && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-semibold serif text-white">Linhua Dictionary</h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Reference Portal v3.4</p>
                  </div>
                  <button onClick={() => setShowDictionary(false)} className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleDictionarySearch} className="relative mb-10 group">
                  <input 
                    autoFocus
                    value={dictQuery}
                    onChange={(e) => setDictQuery(e.target.value)}
                    placeholder="Search word or phrase..."
                    className="w-full pl-14 pr-6 py-5 rounded-2xl bg-[#020617] border border-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all placeholder:text-slate-800"
                  />
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700 group-focus-within:text-emerald-500 transition-colors" size={20} />
                </form>

                <div className="min-h-[260px] max-h-[400px] overflow-y-auto pr-4 scrollbar-thin">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <div className="w-12 h-12 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin mb-6" />
                      <p className="text-sm font-serif italic text-slate-500 uppercase tracking-widest text-[10px] font-bold">Consulting Archives...</p>
                    </div>
                  ) : dictResult ? (
                    <div className="space-y-8">
                      <div className="p-8 bg-[#020617] rounded-3xl border border-slate-800 shadow-inner">
                        <div className="flex items-start justify-between mb-4">
                           <div>
                              <h4 className="text-4xl serif leading-none text-white mb-2">{dictResult.word}</h4>
                              <p className="text-emerald-500/50 mono text-sm italic">{dictResult.pronunciation}</p>
                           </div>
                           <button onClick={() => speak(dictResult.word, 'vn')} className="p-4 bg-[#0f172a] border border-slate-800 text-emerald-500 hover:bg-slate-800 rounded-2xl transition-all shadow-lg">
                             <Volume2 size={24} />
                           </button>
                        </div>
                        <div className="h-[1px] w-full bg-slate-800/50 my-6" />
                        <p className="text-2xl font-serif italic text-emerald-400">{dictResult.translation}</p>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-slate-700 font-black mb-4 px-2">Phrasal Context</p>
                        <div className="space-y-4">
                          {dictResult.examples.map((ex: any, i: number) => (
                            <div key={i} className="p-5 bg-[#020617]/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                              <p className="font-serif text-lg text-slate-300 mb-2">{ex.vn}</p>
                              <p className="text-sm text-slate-500 italic font-medium">{ex.en}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <div className="w-20 h-20 rounded-[30px] bg-[#020617] border border-slate-800 flex items-center justify-center mb-6 text-slate-900">
                        <Search size={32} />
                      </div>
                      <p className="text-sm font-serif italic text-slate-700 max-w-[200px]">The emerald vault is closed. Provide a query to unlock the meaning.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Card Modal */}
      <AnimatePresence>
        {showCustomModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#020617]/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-[#0f172a] border border-slate-800 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-10">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h3 className="text-2xl font-semibold serif text-white">Create Custom Card</h3>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">Translate & Add to Deck</p>
                  </div>
                  <button onClick={() => setShowCustomModal(false)} className="p-3 rounded-2xl bg-slate-800 text-slate-400 hover:text-white transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleCreateCustom} className="relative group">
                  <input 
                    autoFocus
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    placeholder="Type an English or Vietnamese phrase..."
                    className="w-full pl-6 pr-14 py-5 rounded-2xl bg-[#020617] border border-slate-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-none transition-all placeholder:text-slate-800 text-white"
                  />
                  <button 
                    type="submit"
                    disabled={isLoading || !customInput.trim()}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-slate-800 border-t-emerald-500 rounded-full animate-spin" />
                    ) : (
                      <PlusCircle size={24} />
                    )}
                  </button>
                </form>
                
                {isLoading && (
                  <p className="text-[10px] mt-4 text-center uppercase tracking-widest text-emerald-500/60 font-bold animate-pulse">
                    Synthesizing translation...
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Panel - Dark Mode */}
      <AnimatePresence>
        {showSettings && (
           <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 right-0 z-[110] w-full max-w-sm bg-[#0f172a] border-l border-slate-800 shadow-2xl"
          >
            <div className="p-10 h-full flex flex-col">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h3 className="text-2xl font-semibold serif text-white">System Config</h3>
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">Instance #412A</p>
                </div>
                <button onClick={() => setShowSettings(false)} className="p-3 rounded-2xl bg-slate-800 text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-12 flex-grow">
                {/* Direction */}
                <section>
                   <p className="text-[10px] uppercase tracking-widest text-slate-700 font-black mb-4">I/O Logic Direction</p>
                   <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#020617] rounded-3xl border border-slate-800/50">
                      <button 
                        onClick={() => setDirection('vn-to-en')}
                        className={`py-4 rounded-2xl text-xs font-black transition-all uppercase tracking-tighter ${direction === 'vn-to-en' ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xl scale-[1.02]' : 'text-slate-700 hover:text-slate-500'}`}
                      >
                        VN → EN
                      </button>
                      <button 
                        onClick={() => setDirection('en-to-vn')}
                        className={`py-4 rounded-2xl text-xs font-black transition-all uppercase tracking-tighter ${direction === 'en-to-vn' ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-xl scale-[1.02]' : 'text-slate-700 hover:text-slate-500'}`}
                      >
                        EN → VN
                      </button>
                   </div>
                </section>

                {/* Difficulty */}
                <section>
                   <div className="flex justify-between items-center mb-6">
                      <p className="text-[10px] uppercase tracking-widest text-slate-700 font-black">AI Complexity</p>
                      <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30 uppercase">Tier {difficulty}</span>
                   </div>
                   <div className="relative h-1 bg-slate-800 rounded-full">
                    <input 
                      type="range" 
                      min="1" 
                      max="5" 
                      step="1"
                      value={difficulty}
                      onChange={(e) => setDifficulty(parseInt(e.target.value))}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                    />
                    <motion.div 
                      initial={false}
                      animate={{ width: `${(difficulty - 1) * 25}%` }}
                      className="absolute h-1 bg-emerald-500 rounded-full"
                    />
                    <motion.div 
                      initial={false}
                      animate={{ left: `${(difficulty - 1) * 25}%` }}
                      className="absolute w-4 h-4 bg-white border-2 border-emerald-500 rounded-full -top-1.5 -translate-x-1/2 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                   </div>
                   <div className="flex justify-between mt-6 text-[10px] text-slate-700 uppercase font-black tracking-[.2em]">
                      <span>Beginner</span>
                      <span>Advanced</span>
                   </div>
                </section>

                {/* Voice Speed */}
                <section>
                   <div className="flex justify-between items-center mb-6">
                      <p className="text-[10px] uppercase tracking-widest text-slate-700 font-black">Voice Engine Speed</p>
                      <span className="text-xs font-mono font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/30 uppercase">{voiceSpeed.toFixed(1)}x</span>
                   </div>
                   <div className="flex items-center gap-4">
                     <Snail className="text-slate-600" size={16} />
                     <div className="relative h-1 bg-slate-800 rounded-full flex-1">
                      <input 
                        type="range" 
                        min="0.5" 
                        max="1.5" 
                        step="0.1"
                        value={voiceSpeed}
                        onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-10"
                      />
                      <motion.div 
                        initial={false}
                        animate={{ width: `${(voiceSpeed - 0.5) * 100}%` }}
                        className="absolute h-1 bg-emerald-500 rounded-full"
                      />
                      <motion.div 
                        initial={false}
                        animate={{ left: `${(voiceSpeed - 0.5) * 100}%` }}
                        className="absolute w-4 h-4 bg-white border-2 border-emerald-500 rounded-full -top-1.5 -translate-x-1/2 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      />
                     </div>
                     <Rabbit className="text-slate-600" size={16} />
                   </div>
                </section>

                {/* Status Dashboard */}
                <section className="p-8 rounded-[40px] bg-[#020617] border border-slate-800 shadow-inner relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <History size={80} className="text-slate-400" />
                   </div>
                   <p className="text-[10px] uppercase tracking-widest text-emerald-500/50 font-black mb-8">System Metrics</p>
                   <div className="grid grid-cols-1 gap-8 relative z-10">
                      <div className="flex items-end justify-between border-b border-slate-800 pb-4">
                        <span className="text-[10px] uppercase text-slate-600 font-black">Mastered Assets</span>
                        <p className="text-4xl font-serif font-black text-white leading-none">{Object.keys(srsData).length}</p>
                      </div>
                      <div className="flex items-end justify-between">
                        <span className="text-[10px] uppercase text-slate-600 font-black">AI Recall Index</span>
                        <p className="text-4xl font-serif font-black text-emerald-400 leading-none">
                          {Math.round((Object.values(srsData) as SRSState[]).reduce((acc, curr) => acc + curr.ease, 0) / (Object.keys(srsData).length || 1) * 10) / 10}
                        </p>
                      </div>
                   </div>
                </section>
              </div>

              <div className="pt-10 border-t border-slate-800 flex items-center justify-between">
                <button 
                  onClick={() => { if(confirm("This will erase all neural progress. Confirm?")) { localStorage.clear(); window.location.reload(); } }}
                  className="text-[10px] text-red-500/40 hover:text-red-500 font-black uppercase tracking-widest transition-colors"
                >
                  Clear Memory
                </button>
                <div className="flex items-center gap-2 text-[9px] text-slate-800 font-black uppercase tracking-tighter">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  Local Sync v4
                </div>
              </div>
            </div>
           </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
