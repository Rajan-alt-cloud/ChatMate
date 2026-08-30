// Singleton audio context reference
let audioCtx = null;

// Crisp 2-tone Glass Bell Chime (Slack / iOS style)
export const playNotificationSound = async () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        // Reuse single context instance
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }

        // Auto-resume if browser suspended audio context
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        // Tone 1: Gentle Starter Note (880 Hz - A5)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Tone 2: Sweet High Crystal Chime (1320 Hz - E6)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now + 0.07);

        gain2.gain.setValueAtTime(0, now + 0.07);
        gain2.gain.linearRampToValueAtTime(0.15, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.07);
        osc2.stop(now + 0.35);
    } catch (e) {
        console.error('Audio play error:', e);
    }
};