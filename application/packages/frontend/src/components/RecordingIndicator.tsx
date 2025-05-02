import React, { useState, useEffect, useRef } from 'react';

interface RecordingIndicatorProps {
    isRecording: boolean;
}

// Helper function to format time in MM:SS
const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
};

// Function to ensure keyframes are injected
const ensureBlinkKeyframes = () => {
    const keyframeName = 'blink';
    if (typeof document === 'undefined') return; // Guard for SSR or non-browser environments

    let styleSheet: CSSStyleSheet | null = null;
    try {
        // Prefer the first stylesheet, but iterate if necessary (e.g., due to dynamic loading)
        for (let i = 0; i < document.styleSheets.length; i++) {
            // Check if we can access rules (might fail due to CORS)
             if (document.styleSheets[i].cssRules || document.styleSheets[i].rules) {
                 styleSheet = document.styleSheets[i] as CSSStyleSheet;
                 break;
             }
        }

         if (!styleSheet) {
             // Create a new style element if no accessible stylesheet is found
             const styleEl = document.createElement('style');
             document.head.appendChild(styleEl);
             styleSheet = styleEl.sheet as CSSStyleSheet;
         }

        if (!styleSheet) {
             console.error("Could not find or create a stylesheet to inject keyframes.");
             return;
         }


        let keyframesRuleExists = false;
        // Check if rule already exists
         const rules = styleSheet.cssRules || styleSheet.rules; // cross-browser
         for (let i = 0; i < rules.length; i++) {
             const rule = rules[i];
             // Note: CSSKeyframesRule might not exist in older types/browsers, check constructor name as fallback
             if ((rule instanceof CSSKeyframesRule || rule.constructor.name === 'CSSKeyframesRule') && (rule as CSSKeyframesRule).name === keyframeName) {
                 keyframesRuleExists = true;
                 break;
             }
         }


        if (!keyframesRuleExists) {
            styleSheet.insertRule(`
                @keyframes ${keyframeName} {
                    0% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
            `, rules.length);
        }
    } catch (e) {
        console.error("Failed to inject blink keyframe rule:", e);
    }
};


const RecordingIndicator: React.FC<RecordingIndicatorProps> = ({ isRecording }) => {
    const [elapsedTime, setElapsedTime] = useState<number>(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRecording) {
            ensureBlinkKeyframes(); // Make sure animation is available
            setElapsedTime(0); // Reset timer on start
            intervalRef.current = setInterval(() => {
                setElapsedTime(prevTime => prevTime + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            // Optional: Reset time when stopping, or keep the last value
            // setElapsedTime(0);
        }

        // Cleanup interval on unmount or when isRecording changes to false
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRecording]); // Dependency array ensures effect runs when isRecording changes

    return (
        <div style={styles.container}>
            {isRecording ? (
                <>
                    <div style={{ ...styles.dot, animation: 'blink 1s infinite alternate' }}></div>
                    <span style={styles.text}>Recording...</span>
                    <span style={styles.timer}>{formatTime(elapsedTime)}</span>
                </>
            ) : (
                <>
                    {/* Static representation for "not recording" */}
                    <div style={{ ...styles.dot, backgroundColor: '#6c757d', opacity: 0.5 }}></div>
                    <span style={{...styles.text, color: '#6c757d'}}>Ready to record</span>
                     {/* Optionally show 00:00 or hide timer */}
                     {/* <span style={styles.timer}>00:00</span> */}
                </>
            )}
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    container: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: '20px',
        fontSize: '0.9em',
        minHeight: '20px', // Prevent layout shift when timer appears/disappears
    },
    dot: {
        height: '10px',
        width: '10px',
        borderRadius: '50%',
        display: 'inline-block',
        marginRight: '8px',
        backgroundColor: '#dc3545', // Default to recording color
    },
    text: {
        color: '#dc3545', // Default to recording color
        marginRight: '8px',
    },
    timer: {
        fontFamily: 'monospace', // Use monospace for stable width
        color: '#343a40', // Darker color for timer
    },
};

export default RecordingIndicator; 