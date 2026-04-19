import { useState, useEffect, useRef } from 'react';
import { getGpuScore } from '../../data/gpuScoring';
import styles from './AiAdvisor.module.css';

export default function AiAdvisor({ specs }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      content: `Greetings. I have analyzed your hardware: **${specs.gpu || 'Discrete GPU'}** with **${specs.ram || 8}GB RAM**. I am ready to advise on any game compatibility or optimization strategy. What are we playing today?`
    }
  ]);
  const [input, setInput]     = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const gpuScore = getGpuScore(specs.gpu);

      const systemPrompt = `You are CYRI (Can You Run It), an expert PC gaming hardware advisor AI.
The user's current hardware specs are:
- GPU: ${specs.gpu || 'Unknown'}  (internal performance score: ${gpuScore})
- CPU: ${specs.cpuName || specs.cores + ' cores' || 'Unknown'}
- RAM: ${specs.ram || 'Unknown'} GB
- VRAM: ${specs.vram || 'Unknown'} GB
- OS: ${specs.os || 'Unknown'}
- Storage free: ${specs.storage || 'Unknown'} GB

Your job: give concise, expert advice on whether they can run a game, at what settings/resolution, and what tweaks to apply. 
Be direct and specific. Use **bold** for key numbers/settings. Keep responses under 120 words.
If specs are unknown, make reasonable assumptions and say so briefly.`;

      // Build conversation history for context
      const history = messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      }));

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: [...history, { role: 'user', content: userMsg }]
        })
      });

      const data = await response.json();
      const aiText = data.content?.map(b => b.text || '').join('') || 'No response received.';

      setMessages(prev => [...prev, { role: 'ai', content: aiText }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'ai',
        content: 'Connection to AI backend lost. Please try again.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Render message content with basic **bold** support
  const renderContent = (content) =>
    content.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );

  return (
    <div className={styles.container}>
      <div className={styles.terminal}>
        <header className={styles.termHeader}>
          <div className={styles.dots}>
            <span className={styles.dotRed} />
            <span className={styles.dotYellow} />
            <span className={styles.dotGreen} />
          </div>
          <div className={styles.termTitle}>CAN-I-RUN-AI v2.0 (Powered by Claude)</div>
          <div className={styles.status}>ONLINE</div>
        </header>

        <div className={styles.chatArea} ref={scrollRef}>
          {messages.map((msg, idx) => (
            <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
              <div className={styles.avatar}>{msg.role === 'ai' ? '🤖' : '👤'}</div>
              <div className={styles.bubble}>
                {msg.content.split('\n').map((line, i) => (
                  <p key={i}>{renderContent(line)}</p>
                ))}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className={`${styles.message} ${styles.ai}`}>
              <div className={styles.avatar}>🤖</div>
              <div className={styles.bubble}>
                <div className={styles.typing}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}
        </div>

        <form className={styles.inputArea} onSubmit={handleSend}>
          <input
            type="text"
            placeholder="Ask about a game (e.g. 'Can I run Cyberpunk 2077?')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isTyping}
          />
          <button type="submit" disabled={isTyping}>CONSULT</button>
        </form>
      </div>
    </div>
  );
}
