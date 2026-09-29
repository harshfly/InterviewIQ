import useStore from '../../lib/store';
import './Transcript.css';

export default function Transcript() {
  const { fullTranscript, transcriptBuffer } = useStore();

  if (fullTranscript.length === 0 && !transcriptBuffer) return null;

  return (
    <div className="transcript card">
      <div className="transcript-top">
        <h3>Transcript</h3>
        <span className="tag">Live</span>
      </div>
      <div className="transcript-list">
        {fullTranscript.map((entry, i) => (
          <div key={i} className="transcript-line">
            <span className={`transcript-role ${entry.role}`}>
              {entry.role === 'interviewer' ? 'Interviewer' : 'You'}
            </span>
            <span className="transcript-text">{entry.text}</span>
          </div>
        ))}
        {transcriptBuffer && (
          <div className="transcript-line transcript-line--buffering">
            <span className="transcript-role interviewer">Interviewer</span>
            <span className="transcript-text">
              {transcriptBuffer.trim()}
              <span className="cursor">|</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
