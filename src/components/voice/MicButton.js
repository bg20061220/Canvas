"use client";

export default function MicButton({ isListening, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative flex items-center justify-center w-12 h-12 rounded-full
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50
        ${
          isListening
            ? "bg-red-500 hover:bg-red-600 mic-pulse"
            : "bg-blue-600 hover:bg-blue-700"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
      title={isListening ? "Stop listening" : "Start listening"}
    >
      {isListening ? (
        /* Stop icon (square) */
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        /* Microphone icon */
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      )}
    </button>
  );
}
